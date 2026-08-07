/**
 * Pure clustering math for the map module: which dots fall close enough on the
 * frame to draw as one summary, and where that summary sits. React-free like
 * the rest of the engine, so the grouping is unit-testable without a frame. The
 * spatial index both passes bucket into is `grid.ts`, the size a summary draws
 * at is `radius.ts`, and what a group reads out on the ground is `geo.ts`.
 *
 * One rule decides the output: no two marks draw within `gap` of one another
 * ({@link marksOverlap}). {@link seedGroups} is a broad phase under it — a
 * linear pass that can only merge dots the rule would merge anyway, so it takes
 * the count down cheaply before the rule runs, and never decides the result on
 * its own. Both phases live here with the rule they serve: they share the seed
 * algebra below, and a reader following one clustering pass reads one file.
 */

import { POINT_CLUSTER_GAP, POINT_RADIUS } from '../map-constants'
import type { LngLat, MapPoint2D } from '../types'
import { bucket, cellOf, walkNear } from './grid'
import { clusterRadius, MAX_CLUSTER_RADIUS } from './radius'

/**
 * One drawn group: the dots it stands for, and where it draws. A group of one is
 * an ordinary dot, so a mark draws its summaries and its single dots through one
 * path.
 *
 * It carries frame arithmetic alone. What a group reads out — its anchor and its
 * spread — is spherical, costs a `d3-geo` pass per group, and is wanted by one
 * caller each, so `geo.ts` resolves it where it is read rather than on every
 * pass.
 *
 * @internal
 */
export type MapPointCluster = {
	/** The group's dots, as indices into the caller's own points, ascending. */
	members: number[]
	/**
	 * Where the group draws, in frame units: the mean of its members' projected
	 * positions. `null` where the projection has no image for the dots — the US
	 * composite drops points outside its insets — so the group draws nothing and
	 * keeps its readout.
	 */
	at: MapPoint2D | null
}

/**
 * The edge-to-edge gap a `cluster` prop asks for, in frame units; `null` where
 * it is off. The one reading of the public prop, held beside the pass it feeds
 * so the contract is testable without rendering a mark.
 *
 * @internal
 */
export function clusterGap(cluster: boolean | number): number | null {
	if (cluster === true) return POINT_CLUSTER_GAP

	return cluster === false ? null : Math.max(0, cluster)
}

/**
 * Which group holds each of the caller's dots, by the index the mark reports —
 * the resolution a pick needs, since a click names a point the caller passed
 * while the mark draws the groups those points merged into.
 *
 * Built as a whole rather than searched per lookup: a pick is read on every
 * render of the mark it names, and every hover crossing on the map re-renders
 * every mark — so a scan per read would walk the set hundreds of times over one
 * pointer sweep, where this walks it once per regrouping.
 *
 * @internal
 */
export function groupsByMember(groups: readonly MapPointCluster[]): ReadonlyMap<number, number> {
	const held = new Map<number, number>()

	for (const [index, group] of groups.entries()) {
		for (const member of group.members) held.set(member, index)
	}

	return held
}

/** A group under construction: where the broad phase measures from, and the running sum of its members. @internal */
type MapClusterSeed = {
	members: number[]
	/** The first member's projected position, `null` where the projection dropped it. */
	seed: MapPoint2D | null
	sumX: number
	sumY: number
}

/** A group with a position on the frame — the only kind either index holds. @internal */
type MapSeededCluster = MapClusterSeed & { seed: MapPoint2D }

/** Where a group draws and how wide it paints: what the overlap rule reads. @internal */
type MapClusterMark = {
	at: MapPoint2D
	radius: number
}

/**
 * Groups the dots a frame draws too close together to tell apart.
 *
 * `gap` is the clear space two marks keep between their edges. Measured edge to
 * edge, so the one number holds however wide a mark grows: it decides the broad
 * phase's dot-to-dot reach and the overlap rule alike, and a future viewBox zoom
 * scales the whole reach by one factor rather than each term by its own.
 *
 * Grouping runs on the projected frame rather than on lon/lat, because overlap
 * is a property of the drawn picture: the same round summarises in a small frame
 * and separates in a large one without its coordinates changing.
 *
 * Every point reaches exactly one group, in the caller's own order. A `gap` of
 * `null` turns the grouping off and returns the points one per group, unchanged
 * and index for index — the caller asked for every dot, and no pass may take one
 * away. A dot the projection drops holds its own group too, so it keeps its
 * readout row where the map draws nothing for it.
 *
 * @internal
 */
export function clusterPoints(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	gap: number | null,
): MapPointCluster[] {
	if (gap === null) {
		return positions.map((position, index) => ({ members: [index], at: project(position) }))
	}

	return consolidate(seedGroups(positions, project, POINT_RADIUS * 2 + gap), gap).map(summarise)
}

/**
 * The broad phase: dots within `reach` of a group's first member join it, and
 * every other dot starts its own.
 *
 * Measuring from a fixed first member rather than from the group's moving mean
 * is what makes the `grid.ts` lookup exact — a mean that drifted as members
 * landed could leave a group in a different cell from the one its own lookup
 * keys name. It also merges strictly less than the overlap rule does, since two
 * dots inside `reach` are two marks inside their own: this pass can only take
 * work off {@link consolidate}, never decide against it.
 *
 * @internal
 */
function seedGroups(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	reach: number,
): MapClusterSeed[] {
	const groups: MapClusterSeed[] = []

	// Seeds filed into the shared grid (`grid.ts`), at one cell per reach.
	const cells = new Map<number, MapSeededCluster[]>()

	for (const [index, position] of positions.entries()) {
		const at = project(position)

		// A dot the projection drops joins nothing and is joined by nothing: it
		// stays off the index, so it can never be found as a candidate.
		if (at === null) {
			groups.push({ members: [index], seed: null, sumX: 0, sumY: 0 })

			continue
		}

		const nearest = nearestSeed(cells, at, reach)

		if (nearest !== null) {
			nearest.members.push(index)

			nearest.sumX += at.x

			nearest.sumY += at.y

			continue
		}

		const group: MapSeededCluster = { members: [index], seed: at, sumX: at.x, sumY: at.y }

		groups.push(group)

		bucket(cells, cellOf(at, reach)).push(group)
	}

	return groups
}

/**
 * Merges the groups whose marks draw within `gap` of one another, until none do.
 *
 * A merge moves a group's centre and grades its mark up, so the overlapping
 * pairs change as merges land — the rule is a fixpoint, not a single sweep. Each
 * round folds every overlapping group into the first it meets, so the count
 * strictly falls and the rounds run out; in practice one settles it, and a set
 * with nothing to merge costs one indexed pass.
 *
 * @internal
 */
function consolidate(groups: MapClusterSeed[], gap: number): MapClusterSeed[] {
	let held = groups

	let merging = true

	while (merging) {
		const next = mergeRound(held, gap)

		merging = next.length < held.length

		held = next
	}

	return held
}

/** One pass of {@link consolidate}: every group folded into the first mark it draws over. @internal */
function mergeRound(groups: MapClusterSeed[], gap: number): MapClusterSeed[] {
	const next: MapClusterSeed[] = []

	// Marks index-aligned with `next`, so a pair test reads two field loads
	// instead of re-deriving a mean and a grade for each side of it.
	const marks: (MapClusterMark | null)[] = []

	const cells = new Map<number, number[]>()

	// One cell per widest possible reach, so a mark this one could draw over can
	// only sit in the nine cells around it — the bound the broad phase runs on,
	// held here against the marks rather than the dots.
	const reach = MAX_CLUSTER_RADIUS * 2 + gap

	for (const group of groups) {
		const mark = markOf(group)

		const host = mark === null ? -1 : hostFor(cells, marks, mark, gap, reach)

		if (host === -1) {
			if (mark !== null) bucket(cells, cellOf(mark.at, reach)).push(next.length)

			next.push(group)

			marks.push(mark)

			continue
		}

		const merged = absorb(next[host] as MapClusterSeed, group)

		next[host] = merged

		const grown = markOf(merged)

		marks[host] = grown

		// The centre moved and the mark grew, so the slot may belong to another
		// cell now; index it there too. The entry left behind costs at most a
		// repeated test, never a missed pair, because every test reads the live
		// mark rather than the cell it was filed under.
		if (grown !== null) bucket(cells, cellOf(grown.at, reach)).push(host)
	}

	return next
}

/** One group folded into another, leaving both operands untouched. @internal */
function absorb(host: MapClusterSeed, group: MapClusterSeed): MapClusterSeed {
	return {
		// Sorted, so the group still reports the caller's lowest index first — the
		// stop a pick names, and the ordinal an unnamed dot reads out by.
		members: [...host.members, ...group.members].sort((a, b) => a - b),
		seed: host.seed,
		sumX: host.sumX + group.sumX,
		sumY: host.sumY + group.sumY,
	}
}

/**
 * The slot of the first indexed mark this one draws within `gap` of, or `-1`
 * where it stands clear of every one of them.
 *
 * @internal
 */
function hostFor(
	cells: Map<number, number[]>,
	marks: readonly (MapClusterMark | null)[],
	mark: MapClusterMark,
	gap: number,
	reach: number,
): number {
	let host = -1

	walkNear(cells, mark.at, reach, (slot) => {
		const other = marks[slot]

		if (other == null || !marksOverlap(other, mark, gap)) return false

		host = slot

		return true
	})

	return host
}

/**
 * The nearest group whose first member lies within `reach` of `at`, or `null`
 * where the dot stands alone. Distance is compared squared, so the scan takes no
 * square root, and a tie keeps the earlier group — the grouping then reads the
 * same on every pass over the same input.
 *
 * @internal
 */
function nearestSeed(
	cells: Map<number, MapSeededCluster[]>,
	at: MapPoint2D,
	reach: number,
): MapSeededCluster | null {
	const limit = reach * reach

	let nearest: MapSeededCluster | null = null

	let best = Number.POSITIVE_INFINITY

	walkNear(cells, at, reach, (group) => {
		const spread = squared(group.seed, at)

		if (spread > limit || spread >= best) return false

		best = spread

		nearest = group

		return false
	})

	return nearest
}

/** The squared distance between two frame points, so a comparison takes no square root. @internal */
function squared(a: MapPoint2D, b: MapPoint2D): number {
	const dx = a.x - b.x

	const dy = a.y - b.y

	return dx * dx + dy * dy
}

/** A group's drawn mark, or `null` where the projection has no image for it. @internal */
function markOf(group: MapClusterSeed): MapClusterMark | null {
	const at = centre(group)

	return at === null ? null : { at, radius: clusterRadius(group.members.length) }
}

/**
 * Whether two marks draw closer than the clear space between their edges allows.
 * The one rule the output obeys — everything above it only decides how few pairs
 * have to be asked.
 *
 * @internal
 */
function marksOverlap(a: MapClusterMark, b: MapClusterMark, gap: number): boolean {
	const reach = a.radius + b.radius + gap

	return squared(a.at, b.at) < reach * reach
}

/** Where a group draws: the mean of its members' projected positions. @internal */
function centre({ members, seed, sumX, sumY }: MapClusterSeed): MapPoint2D | null {
	return seed === null ? null : { x: sumX / members.length, y: sumY / members.length }
}

/** Resolves a built group to the dots it holds and the point it draws at. @internal */
function summarise(group: MapClusterSeed): MapPointCluster {
	return { members: group.members, at: centre(group) }
}
