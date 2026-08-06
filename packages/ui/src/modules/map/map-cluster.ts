/**
 * Pure clustering math for the map module: which dots fall close enough on the
 * frame to draw as one summary, where that summary sits, and how far its stops
 * spread on the ground. Kept React-free beside `map-geometry.ts` and
 * `map-projection.ts`, so the grouping is unit-testable without a frame.
 *
 * One rule decides the output: no two marks draw within `gap` of one another
 * ({@link marksOverlap}). {@link seedGroups} is a broad phase under it — a
 * linear pass that can only merge dots the rule would merge anyway, so it takes
 * the count down cheaply before the rule runs, and never decides the result on
 * its own.
 */

import { geoCentroid, geoDistance } from 'd3-geo'
import { CLUSTER_RADIUS_STEPS, EARTH_RADIUS_METERS, POINT_RADIUS } from './map-constants'
import type { MapPoint2D } from './map-geometry'
import type { LngLat } from './types'

/**
 * One drawn group: the dots it stands for, and where it draws. A group of one is
 * an ordinary dot, so a mark draws its summaries and its single dots through one
 * path.
 *
 * It carries frame arithmetic alone. What a group reads out — its anchor and its
 * spread — is spherical, costs a `d3-geo` pass per group, and is wanted by one
 * caller each, so {@link clusterAnchor} and {@link clusterSpan} resolve it where
 * it is read rather than on every pass.
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

/** The widest a summary ever draws, so no pair beyond twice it plus the gap can meet. @internal */
const MAX_CLUSTER_RADIUS: number = CLUSTER_RADIUS_STEPS.at(-1)?.radius ?? POINT_RADIUS

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
 * is what makes the grid below exact — a mean that drifted as members landed
 * could leave the cell its own lookup keys on. It also merges strictly less than
 * the overlap rule does, since two dots inside `reach` are two marks inside
 * their own: this pass can only take work off {@link consolidate}, never decide
 * against it.
 *
 * @internal
 */
function seedGroups(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	reach: number,
): MapClusterSeed[] {
	const groups: MapClusterSeed[] = []

	// Seeds bucketed by grid cell, one cell per reach: a seed within reach of a
	// dot can only sit in the dot's own cell or one of the eight around it, so
	// each dot reads nine buckets rather than every group built so far — a linear
	// pass where the naive scan is quadratic.
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

/**
 * Walks every entry indexed in the nine cells around a point — at one cell per
 * reach, the whole field a merge can cross — and stops as soon as `visit`
 * answers `true`.
 *
 * A walk rather than a returned list: both passes run this per mark across sets
 * of hundreds, and a list would allocate one array each — the cost the numeric
 * cell key below exists to avoid.
 *
 * @internal
 */
function walkNear<T>(
	cells: Map<number, T[]>,
	at: MapPoint2D,
	reach: number,
	visit: (entry: T) => boolean,
): void {
	const cx = Math.floor(at.x / reach)

	const cy = Math.floor(at.y / reach)

	for (let step = 0; step < 9; step++) {
		const held = cells.get(cellKey(cx + ((step % 3) - 1), cy + (Math.floor(step / 3) - 1)))

		if (held === undefined) continue

		for (const entry of held) if (visit(entry)) return
	}
}

/**
 * The grid key for one cell. Packed into a number rather than a string: the
 * walks above read nine cells per mark, and building nine strings each would
 * allocate by the thousand across a set of hundreds. Cell indices are frame
 * coordinates over the reach, so they sit far inside the ±32,768 the packing
 * holds.
 *
 * @internal
 */
function cellKey(cx: number, cy: number): number {
	return cx * 65536 + cy
}

/** The cell key a frame position falls under. @internal */
function cellOf(at: MapPoint2D, reach: number): number {
	return cellKey(Math.floor(at.x / reach), Math.floor(at.y / reach))
}

/** The bucket for a cell, created empty on first use. @internal */
function bucket<T>(cells: Map<number, T[]>, key: number): T[] {
	const held = cells.get(key)

	if (held !== undefined) return held

	const fresh: T[] = []

	cells.set(key, fresh)

	return fresh
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

/** The members' own coordinates. Every index came from `positions`, so the read holds no gaps. @internal */
function clusterCoordinates(members: readonly number[], positions: readonly LngLat[]): LngLat[] {
	return members.map((index) => positions[index] as LngLat)
}

/**
 * A group's own lon/lat: a lone dot's position, or its members' spherical
 * centroid — which a set spanning the antimeridian needs, where a mean of
 * longitudes would land on the far side of the world.
 *
 * @internal
 */
export function clusterAnchor(members: readonly number[], positions: readonly LngLat[]): LngLat {
	const coordinates = clusterCoordinates(members, positions)

	const first = coordinates[0] as LngLat

	if (coordinates.length === 1) return first

	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates } as unknown as Parameters<
		typeof geoCentroid
	>[0])

	// Antipodal members cancel to no centre. The first member anchors the group
	// instead, which is a position the projection can draw.
	return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : first
}

/**
 * How far a group spreads, in metres: the diameter of the circle about its
 * {@link clusterAnchor} that holds every member. `0` for a lone dot, which
 * spreads over nothing and must not pay a spherical pass to say so.
 *
 * @internal
 */
export function clusterSpan(members: readonly number[], positions: readonly LngLat[]): number {
	if (members.length === 1) return 0

	const anchor = clusterAnchor(members, positions)

	let radians = 0

	for (const position of clusterCoordinates(members, positions)) {
		radians = Math.max(radians, geoDistance(anchor, position))
	}

	return 2 * radians * EARTH_RADIUS_METERS
}

/**
 * The radius a group draws at: {@link POINT_RADIUS} for a lone dot, then one
 * step up per grade of {@link CLUSTER_RADIUS_STEPS}. The size carries the
 * magnitude, so a reader grades a summary against its neighbours before reading
 * the count inside it.
 *
 * @internal
 */
export function clusterRadius(count: number): number {
	return CLUSTER_RADIUS_STEPS.findLast((step) => count >= step.from)?.radius ?? POINT_RADIUS
}
