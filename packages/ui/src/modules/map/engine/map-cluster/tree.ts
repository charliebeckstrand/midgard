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
import { bucket, cellKey, squared, toCellKey } from './grid'
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
	/** The cell of the grid that holds the node. */
	cell: number
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
	/**
	 * The live nodes by cell. A node that merges or moves leaves its old entry
	 * behind, and a walk drops an entry that no longer matches its node.
	 */
	cells: Map<number, number[]>
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
		cell: Number.NaN,
		stamp: 0,
		stale: false,
	}
}

/** Files a node in the cell where it stands, unless it already stands in it. @internal */
function fileNode(state: MapTreeBuild, index: number): void {
	const node = state.build[index] as MapBuildNode

	const cell = state.reach > 0 ? toCellKey(node.at, state.reach) : 0

	if (cell === node.cell) return

	node.cell = cell

	bucket(state.cells, cell).push(index)
}

/** Visits the live nodes of one cell, and drops the entries that no longer match. @internal */
function walkCell(
	state: MapTreeBuild,
	key: number,
	visit: (index: number, node: MapBuildNode) => void,
): void {
	const held = state.cells.get(key)

	if (held === undefined) return

	for (let at = 0; at < held.length; ) {
		const index = held[at] as number

		const node = state.build[index] as MapBuildNode

		if (node.live && node.cell === key) {
			visit(index, node)

			at++

			continue
		}

		held[at] = held[held.length - 1] as number

		held.pop()
	}
}

/**
 * Visits each live node that can overlap `from` below the limit: every node in
 * the cells within the reach of `from` and of the widest node.
 *
 * @internal
 */
function walkNodes(
	state: MapTreeBuild,
	from: MapBuildNode,
	visit: (index: number, node: MapBuildNode) => void,
): void {
	const { reach } = state

	if (reach === 0) {
		walkCell(state, 0, visit)

		return
	}

	const span = Math.ceil(((from.radius + state.widest + state.widestGap) * state.limit) / reach)

	const cx = Math.floor(from.at.x / reach)

	const cy = Math.floor(from.at.y / reach)

	for (let x = cx - span; x <= cx + span; x++) {
		for (let y = cy - span; y <= cy + span; y++) walkCell(state, cellKey(x, y), visit)
	}
}

/** Gives a node its first overlap, and queues it below the limit. @internal */
function setPartner(state: MapTreeBuild, index: number, partner: number, scale: number): void {
	const node = state.build[index] as MapBuildNode

	node.partner = partner

	node.scale = scale

	node.stamp++

	node.stale = false

	if (partner === -1) return

	bucket(state.watchers, partner).push(index)

	if (scale < state.limit) enqueue(state.queue, { scale, index, stamp: node.stamp })
}

/** Finds the node that `index` overlaps first, among the live nodes near it. @internal */
function findPartner(state: MapTreeBuild, index: number): void {
	const node = state.build[index] as MapBuildNode

	let partner = -1

	let scale = Number.POSITIVE_INFINITY

	walkNodes(state, node, (other, held) => {
		if (other === index) return

		const pair = pairScale(node, held)

		if (earlier(pair, other, scale, partner)) {
			scale = pair

			partner = other
		}
	})

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

	state.taken.push(index)

	fileNode(state, into)
}

/**
 * Settles a merged node. One walk of its neighbors finds what it changes. A
 * neighbor that overlaps it by the scale of the merge joins it now, the nearest
 * first, and the walk runs again. Else the walk gives the first overlap of the
 * merged node, and tells each neighbor that it overlaps before the first
 * overlap of the neighbor.
 *
 * @internal
 */
function settleNode(state: MapTreeBuild, merged: number): void {
	const made = state.build[merged] as MapBuildNode

	const pairs: number[] = []

	for (;;) {
		let next = -1

		let soonest = Number.POSITIVE_INFINITY

		let partner = -1

		let earliest = Number.POSITIVE_INFINITY

		pairs.length = 0

		walkNodes(state, made, (other, node) => {
			if (other === merged) return

			const pair = pairScale(node, made)

			pairs.push(other, pair)

			if (pair <= state.now && earlier(pair, other, soonest, next)) {
				soonest = pair

				next = other
			}

			if (earlier(pair, other, earliest, partner)) {
				earliest = pair

				partner = other
			}
		})

		if (next === -1) {
			setPartner(state, merged, partner, earliest)

			break
		}

		takeNode(state, merged, next)
	}

	for (let at = 0; at < pairs.length; at += 2) {
		const other = pairs[at] as number

		const pair = pairs[at + 1] as number

		const node = state.build[other] as MapBuildNode

		if (earlier(pair, merged, node.scale, node.partner)) setPartner(state, other, merged, pair)
	}
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
 * Only the pairs within the reach of the limit are tested, through the grid.
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

	const state: MapTreeBuild = {
		nodes: [],
		build: [],
		watchers: new Map(),
		cells: new Map(),
		queue: [],
		reach: Number.isFinite(reach) && reach > 0 ? reach : 0,
		widest: dot,
		widestGap,
		limit,
		getRadius,
		now: 0,
		taken: [],
	}

	for (const [index, position] of positions.entries()) {
		const at = project(position)

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
