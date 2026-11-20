/**
 * The merges of a set of dots over the scale of the frame. React-free, like
 * the rest of the engine.
 *
 * One rule decides the groups: no two marks draw within `gap` of one another.
 * Where the dots ask for different gaps, a pair keeps the larger of its two.
 * Two marks overlap from one scale up ({@link pairScale}): their distance in
 * frame units over their reach in device pixels. As the frame narrows, the
 * pair that overlaps first merges first, and a merge only adds to a group. The
 * groups therefore form a tree. Each group holds over one range of scales, and
 * a frame that widens only splits groups.
 *
 * The groups of one frame are the cut of the tree at its scale
 * ({@link cutTree}). The paint before the box is measured reads the whole tree
 * (`MapPoints`). The server cannot know the width of the box, so it draws the
 * groups of every width, each with the range of widths where it holds.
 */

import type { LngLat, MapPoint2D, MapProjector } from '../types'
import { bucket, squared } from './grid'
import {
	insertQuad,
	type MapQuad,
	type MapQuadTree,
	quadDistance,
	quadTree,
	rekeyQuad,
	removeQuad,
	walkQuads,
} from './quad'
import type { MapClusterRadius } from './radius'

/**
 * One drawn group: the dots it stands for, and where it draws. A group of one is
 * an ordinary dot, so a mark draws its summaries and its single dots through one
 * path.
 *
 * It carries frame arithmetic alone. What a group reads out (its anchor and
 * its spread) is spherical. It costs a `d3-geo` pass per group, and is wanted
 * by one caller each. `geo.ts` therefore resolves it where it is read, rather
 * than on every pass.
 *
 * @internal
 */
export type MapPointCluster = {
	/** The group's dots, as indices into the caller's own points, ascending. */
	members: number[]
	/**
	 * Where the group draws, in frame units: the mean of its members' projected
	 * positions. `null` where the projection has no image for the dots: the US
	 * composite drops points outside its insets. The group then draws nothing and
	 * keeps its readout.
	 */
	at: MapPoint2D | null
}

/**
 * One node of a {@link clusterTree}: a dot, or a merge of nodes.
 *
 * @internal
 */
export type MapClusterNode = MapPointCluster & {
	/**
	 * The scale from which the node holds, in frame units per device pixel, not
	 * included: the scale of the merge that made it. `0` for a dot.
	 */
	from: number
	/**
	 * The scale up to which the node holds, included: the scale of the merge that
	 * takes it into a larger group. `Infinity` where no merge takes it up to the
	 * limit of the tree.
	 */
	to: number
}

/**
 * The merges of a set of dots over the scale, up to a limit.
 *
 * @internal
 */
export type MapClusterTree = {
	/**
	 * Every node: the dots first, index for index with the positions, then each
	 * merge in the order of its scale.
	 */
	nodes: MapClusterNode[]
	/** The largest scale that the tree covers, included. */
	limit: number
}

/** A live node while the tree builds: what the rule reads of it. @internal */
type MapBuildNode = {
	at: MapPoint2D
	/** The largest gap that a member asks for, in device pixels. */
	gap: number
	/** The radius that the node draws at, in device pixels. */
	radius: number
	sumX: number
	sumY: number
	count: number
	/** The node that this one overlaps first, `-1` for none, and the scale of that overlap. */
	partner: number
	scale: number
	live: boolean
	/** Counts the changes of the partner, so the queue can drop an entry that is out of date. */
	stamp: number
	/**
	 * Whether the partner merged. The node then holds its last scale until the
	 * queue reaches it, and looks for its partner again only then. No overlap of
	 * the node can come before that scale, except an overlap with the merged
	 * node, which the merge tells it of. Most such nodes merge before the queue
	 * reaches them, so most never look again.
	 */
	stale: boolean
}

/** One entry of the queue of overlaps: a node, its scale then, and the stamp then. @internal */
type MapQueued = { scale: number; index: number; stamp: number }

/** Everything that one build of a tree reads and writes. @internal */
type MapTreeBuild = {
	nodes: MapClusterNode[]
	/** The live state of each node, `null` for a dot that the projection drops. */
	build: (MapBuildNode | null)[]
	/**
	 * Who has had each node as its first overlap, so a merge tells them to look
	 * again. A node that took another partner since stays in the list, and the
	 * merge skips it.
	 */
	watchers: Map<number, number[]>
	/** The live nodes, by position. The key of each node is its {@link MapBuildNode.scale}. */
	quads: MapQuadTree
	/**
	 * Each node with its first overlap, the smallest scale first. An entry that a
	 * later change of the node outdates stays in the queue, and the build drops it.
	 */
	queue: MapQueued[]
	/** The size of a cell: the reach of two dots at the limit, in frame units. `0` with no grid. */
	reach: number
	/** The largest radius that a node has drawn at. It only grows as the nodes merge. */
	widest: number
	widestGap: number
	limit: number
	getRadius: MapClusterRadius
	/** The scale of the merge that the build reached. */
	now: number
	/** The nodes that the current merge took in, so their watchers look again. */
	taken: number[]
}

/**
 * The scale from which two marks overlap: the distance between them in frame
 * units, over their reach in device pixels. The reach is the two radii and the
 * larger of the two gaps. The marks overlap at each scale above this one, and
 * at no scale up to it.
 *
 * @internal
 */
function pairScale(a: MapBuildNode, b: MapBuildNode): number {
	return Math.sqrt(squared(a.at, b.at)) / (a.radius + b.radius + Math.max(a.gap, b.gap))
}

/** Whether a pair at `scale` with `index` comes before the pair at `best` with `held`. @internal */
function earlier(scale: number, index: number, best: number, held: number): boolean {
	return scale < best || (scale === best && index < held)
}

/** Whether entry `a` comes before entry `b`: the smaller scale, then the lower index. @internal */
function before(a: MapQueued, b: MapQueued): boolean {
	return earlier(a.scale, a.index, b.scale, b.index)
}

/** Adds an entry to a binary heap of entries. @internal */
function enqueue(heap: MapQueued[], entry: MapQueued): void {
	let at = heap.push(entry) - 1

	while (at > 0) {
		const up = (at - 1) >> 1

		const parent = heap[up] as MapQueued

		if (!before(entry, parent)) break

		heap[at] = parent

		at = up
	}

	heap[at] = entry
}

/** Takes the first entry off a binary heap of entries. @internal */
function dequeue(heap: MapQueued[]): MapQueued | undefined {
	const top = heap[0]

	const last = heap.pop()

	if (top === undefined || last === undefined || heap.length === 0) return top

	let at = 0

	for (;;) {
		const left = at * 2 + 1

		if (left >= heap.length) break

		const right = left + 1

		const child =
			right < heap.length && before(heap[right] as MapQueued, heap[left] as MapQueued)
				? right
				: left

		if (!before(heap[child] as MapQueued, last)) break

		heap[at] = heap[child] as MapQueued

		at = child
	}

	heap[at] = last

	return top
}

/** A live node with nothing merged into it yet. @internal */
function buildNode(at: MapPoint2D, gap: number, radius: number): MapBuildNode {
	return {
		at,
		gap,
		radius,
		sumX: at.x,
		sumY: at.y,
		count: 1,
		partner: -1,
		scale: Number.POSITIVE_INFINITY,
		live: true,
		stamp: 0,
		stale: false,
	}
}

/** Files a node at the position where it stands now. @internal */
function fileNode(state: MapTreeBuild, index: number): void {
	removeQuad(state.quads, index)

	insertQuad(state.quads, index)
}

/**
 * The cells that a search from `from` reads, as a range of cell indices on
 * each axis: every cell within the reach of `from` and of the widest node at
 * the limit. `null` with no grid, where a search reads each node.
 *
 * A node outside the range overlaps `from` above the limit only. The range
 * keeps each search to the nodes that a walk of these cells reads, so the
 * quadtree gives the same tree as the walk of the cells did.
 *
 * @internal
 */
type MapSearchWindow = { x0: number; x1: number; y0: number; y1: number } | null

/** The {@link MapSearchWindow} of a search from `from`. @internal */
function searchWindow(state: MapTreeBuild, from: MapBuildNode): MapSearchWindow {
	const { reach } = state

	if (reach === 0) return null

	const span = Math.ceil(((from.radius + state.widest + state.widestGap) * state.limit) / reach)

	const cx = Math.floor(from.at.x / reach)

	const cy = Math.floor(from.at.y / reach)

	return { x0: cx - span, x1: cx + span, y0: cy - span, y1: cy + span }
}

/** Whether the cell of `at` is in `window`. @internal */
function inWindow(state: MapTreeBuild, window: MapSearchWindow, at: MapPoint2D): boolean {
	if (window === null) return true

	const cx = Math.floor(at.x / state.reach)

	const cy = Math.floor(at.y / state.reach)

	return cx >= window.x0 && cx <= window.x1 && cy >= window.y0 && cy <= window.y1
}

/** Whether a box can hold a node of `window`. @internal */
function quadInWindow(state: MapTreeBuild, window: MapSearchWindow, quad: MapQuad): boolean {
	if (window === null) return true

	const { reach } = state

	return (
		Math.floor(quad.x1 / reach) >= window.x0 &&
		Math.floor(quad.x0 / reach) <= window.x1 &&
		Math.floor(quad.y1 / reach) >= window.y0 &&
		Math.floor(quad.y0 / reach) <= window.y1
	)
}

/**
 * The largest reach of a pair of `from`, in device pixels: its radius, the
 * widest radius, and the larger of its gap and the widest gap. No pair of
 * `from` reaches further.
 *
 * @internal
 */
function widestReach(state: MapTreeBuild, from: MapBuildNode): number {
	return from.radius + state.widest + Math.max(from.gap, state.widestGap)
}

/**
 * The smallest {@link pairScale} that `from` can have with a node in `quad`:
 * the distance to the box over the {@link widestReach} of `from`. No node of the
 * box overlaps `from` below it. Rounding keeps the bound, because each step of
 * the sum and of the quotient rounds in one direction alike for the bound and
 * for the scale.
 *
 * @internal
 */
function quadScale(quad: MapQuad, from: MapBuildNode, reach: number): number {
	return Math.sqrt(quadDistance(quad, from.at)) / reach
}

/**
 * The node that `from` overlaps first among the live nodes of its window, and
 * the scale of that overlap: the smallest scale, then the lower index. `-1`
 * and `Infinity` for none. The search rules out each box whose nodes overlap
 * `from` later than the best node so far, so it reads the nodes near `from`
 * alone, however dense the dots stand.
 *
 * @internal
 */
function firstOverlap(
	state: MapTreeBuild,
	index: number,
	from: MapBuildNode,
): { partner: number; scale: number } {
	const window = searchWindow(state, from)

	const reach = widestReach(state, from)

	let partner = -1

	let scale = Number.POSITIVE_INFINITY

	walkQuads(
		state.quads,
		from.at,
		(quad) => quadInWindow(state, window, quad) && quadScale(quad, from, reach) <= scale,
		(other) => {
			if (other === index) return

			const node = state.build[other] as MapBuildNode

			if (!inWindow(state, window, node.at)) return

			const pair = pairScale(node, from)

			if (earlier(pair, other, scale, partner)) {
				scale = pair

				partner = other
			}
		},
	)

	return { partner, scale }
}

/** Gives a node its first overlap, and queues it below the limit. @internal */
function setPartner(state: MapTreeBuild, index: number, partner: number, scale: number): void {
	const node = state.build[index] as MapBuildNode

	node.partner = partner

	node.scale = scale

	node.stamp++

	node.stale = false

	rekeyQuad(state.quads, index)

	if (partner === -1) return

	bucket(state.watchers, partner).push(index)

	if (scale < state.limit) enqueue(state.queue, { scale, index, stamp: node.stamp })
}

/** Finds the node that `index` overlaps first, among the live nodes near it. @internal */
function findPartner(state: MapTreeBuild, index: number): void {
	const { partner, scale } = firstOverlap(state, index, state.build[index] as MapBuildNode)

	setPartner(state, index, partner, scale)
}

/** Takes a live node into the merged node `into`, at the scale the build reached. @internal */
function takeNode(state: MapTreeBuild, into: number, index: number): void {
	const node = state.build[index] as MapBuildNode

	const made = state.build[into] as MapBuildNode

	;(state.nodes[index] as MapClusterNode).to = state.now

	;(state.nodes[into] as MapClusterNode).members.push(
		...(state.nodes[index] as MapClusterNode).members,
	)

	made.sumX += node.sumX

	made.sumY += node.sumY

	made.count += node.count

	made.gap = Math.max(made.gap, node.gap)

	made.at = { x: made.sumX / made.count, y: made.sumY / made.count }

	made.radius = state.getRadius(made.count)

	state.widest = Math.max(state.widest, made.radius)

	node.live = false

	removeQuad(state.quads, index)

	state.taken.push(index)

	fileNode(state, into)
}

/**
 * Settles a merged node. A neighbor that overlaps it by the scale of the merge
 * joins it now. The first overlap of the merged node decides: while that
 * overlap comes by the scale of the merge, it is the nearest such neighbor, and
 * it joins. Else it is the first overlap of the merged node. Then each neighbor
 * that overlaps the merged node before its own first overlap takes the merged
 * node as its first overlap.
 *
 * @internal
 */
function settleNode(state: MapTreeBuild, merged: number): void {
	const made = state.build[merged] as MapBuildNode

	for (;;) {
		const { partner, scale } = firstOverlap(state, merged, made)

		if (partner === -1 || scale > state.now) {
			setPartner(state, merged, partner, scale)

			break
		}

		takeNode(state, merged, partner)
	}

	tellNeighbors(state, merged, made)
}

/**
 * Gives each live node of the window of `made` that overlaps it before its own
 * first overlap the merged node as its first overlap. The walk rules out each
 * box whose nodes all overlap their own first overlap before they can overlap
 * `made`: the bound of the box is above the largest scale in it.
 *
 * @internal
 */
function tellNeighbors(state: MapTreeBuild, merged: number, made: MapBuildNode): void {
	const window = searchWindow(state, made)

	const reach = widestReach(state, made)

	walkQuads(
		state.quads,
		made.at,
		(quad) => quadInWindow(state, window, quad) && quadScale(quad, made, reach) <= quad.max,
		(other) => {
			if (other === merged) return

			const node = state.build[other] as MapBuildNode

			if (!inWindow(state, window, node.at)) return

			const pair = pairScale(node, made)

			if (earlier(pair, merged, node.scale, node.partner)) setPartner(state, other, merged, pair)
		},
	)
}

/**
 * Marks each node whose first overlap merged, and queues it to look again at
 * its last scale (see {@link MapBuildNode.stale}).
 *
 * @internal
 */
function markStale(state: MapTreeBuild, gone: readonly number[]): void {
	for (const index of gone) {
		for (const watcher of state.watchers.get(index) ?? []) {
			const node = state.build[watcher] as MapBuildNode

			if (!node.live || node.partner !== index || node.stale) continue

			node.stamp++

			node.stale = true

			enqueue(state.queue, { scale: node.scale, index: watcher, stamp: node.stamp })
		}

		state.watchers.delete(index)
	}
}

/** Merges a node with its first overlap, at `scale` or at the scale the build reached. @internal */
function mergeNodes(state: MapTreeBuild, first: number, scale: number): void {
	// A merged node that overlaps a neighbor at a past scale takes it in at once.
	state.now = Math.max(state.now, scale)

	const a = state.build[first] as MapBuildNode

	const second = a.partner

	const merged = state.nodes.length

	state.nodes.push({ members: [], at: null, from: state.now, to: Number.POSITIVE_INFINITY })

	state.build.push({ ...buildNode(a.at, 0, 0), sumX: 0, sumY: 0, count: 0 })

	state.taken = []

	takeNode(state, merged, first)

	takeNode(state, merged, second)

	settleNode(state, merged)

	const node = state.nodes[merged] as MapClusterNode

	node.members.sort((x, y) => x - y)

	node.at = (state.build[merged] as MapBuildNode).at

	markStale(state, state.taken)
}

/**
 * Takes the entries off the queue in order until it is empty: a node that looks
 * for its partner again, or a merge. An entry that a later change outdates
 * does nothing.
 *
 * @internal
 */
function runQueue(state: MapTreeBuild): void {
	for (let entry = dequeue(state.queue); entry !== undefined; entry = dequeue(state.queue)) {
		const node = state.build[entry.index]

		if (!node?.live || node.stamp !== entry.stamp) continue

		if (node.stale) findPartner(state, entry.index)
		else mergeNodes(state, entry.index, entry.scale)
	}
}

/** The box that holds each position that the projection gives. @internal */
function findBounds(projected: readonly (MapPoint2D | null)[]): {
	x0: number
	y0: number
	x1: number
	y1: number
} {
	const bounds = { x0: 0, y0: 0, x1: 0, y1: 0 }

	let first = true

	for (const at of projected) {
		if (at === null) continue

		if (first) {
			bounds.x0 = at.x
			bounds.x1 = at.x
			bounds.y0 = at.y
			bounds.y1 = at.y

			first = false

			continue
		}

		bounds.x0 = Math.min(bounds.x0, at.x)
		bounds.x1 = Math.max(bounds.x1, at.x)
		bounds.y0 = Math.min(bounds.y0, at.y)
		bounds.y1 = Math.max(bounds.y1, at.y)
	}

	return bounds
}

/**
 * Builds the tree of the merges of the dots, for every scale up to `limit`.
 *
 * The pair that overlaps at the smallest scale merges first. The merged node
 * draws at the mean of the positions of its dots, at the radius of its count,
 * and asks for the largest gap of its dots. A merged node can overlap a
 * neighbor at a scale that is already past. It then takes that neighbor in at
 * the scale of its own merge, so a chain of merges at one scale gives one
 * group. Of two pairs at one scale, the node with the lower index goes first,
 * so the tree is the same on each pass over the same input. That holds
 * wherever the frame puts its origin, and at any scale of the frame. The scale
 * of a pair is a ratio, so it scales with the frame alike.
 *
 * A dot that the projection drops merges with nothing. It holds its own group
 * at every scale.
 *
 * A search reads only the nodes within the reach of the limit, as the cells of
 * one reach give them. A quadtree holds the nodes, so a search also rules out
 * each box whose nodes cannot come first. Dots that stand close together, at
 * distinct positions, then cost about as much as dots that spread out
 * (`quad.ts`). Dots at one position cannot part: a pile of them still costs
 * the square of its count, as each search reads the whole pile.
 *
 * @param getGap - The gap that each dot asks for, in device pixels.
 * @param widestGap - The largest of the gaps.
 * @param limit - The largest scale that the tree must answer.
 * @internal
 */
export function clusterTree(
	positions: readonly LngLat[],
	project: MapProjector,
	getGap: (index: number) => number,
	widestGap: number,
	getRadius: MapClusterRadius,
	limit: number,
): MapClusterTree {
	const dot = getRadius(1)

	const reach = (dot * 2 + widestGap) * limit

	const projected = positions.map((position) => project(position))

	const state: MapTreeBuild = {
		nodes: [],
		build: [],
		watchers: new Map(),
		quads: quadTree(
			findBounds(projected),
			(index) => (state.build[index] as MapBuildNode).at,
			(index) => (state.build[index] as MapBuildNode).scale,
		),
		queue: [],
		reach: Number.isFinite(reach) && reach > 0 ? reach : 0,
		widest: dot,
		widestGap,
		limit,
		getRadius,
		now: 0,
		taken: [],
	}

	for (const [index, at] of projected.entries()) {
		state.nodes.push({ members: [index], at, from: 0, to: Number.POSITIVE_INFINITY })

		state.build.push(at === null ? null : buildNode(at, getGap(index), dot))

		if (at !== null) fileNode(state, index)
	}

	for (const [index, node] of state.build.entries()) if (node !== null) findPartner(state, index)

	runQueue(state)

	return { nodes: state.nodes, limit }
}

/**
 * The groups of a tree at one scale: each node that holds at that scale, in the
 * order of its first dot. The scale must not be above the limit of the tree.
 *
 * @internal
 */
export function cutTree(tree: MapClusterTree, unitsPerPixel: number): MapPointCluster[] {
	return tree.nodes
		.filter((node) => node.from < unitsPerPixel && unitsPerPixel <= node.to)
		.sort((a, b) => (a.members[0] ?? 0) - (b.members[0] ?? 0))
		.map(({ members, at }) => ({ members, at }))
}
