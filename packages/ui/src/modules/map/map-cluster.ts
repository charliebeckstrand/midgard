/**
 * Pure clustering math for the map module: which dots fall close enough on the
 * frame to draw as one summary, where that summary sits, and how far its stops
 * spread on the ground. Kept React-free beside `map-geometry.ts` and
 * `map-projection.ts`, so the grouping is unit-testable without a frame.
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

/** A group under construction: the seed the distance test measures from, and the running sum of its members. @internal */
type MapClusterSeed = {
	members: number[]
	/** The first member's projected position, `null` where the projection dropped it. */
	seed: MapPoint2D | null
	sumX: number
	sumY: number
}

/** A group the grid holds: a dot with no image on the frame joins nothing, so it never reaches one. @internal */
type MapSeededCluster = MapClusterSeed & { seed: MapPoint2D }

/**
 * Groups the dots a frame draws too close together to tell apart, in one pass.
 *
 * A dot joins the nearest group whose seed — its first member, never the group's
 * moving mean — lies within `distance`, and starts its own group otherwise. A
 * fixed seed is what makes the grid below exact: a mean that drifted as members
 * landed could leave the cell its lookup keys on. Grouping runs on the projected
 * frame rather than on lon/lat, because overlap is a property of the drawn
 * picture: the same round summarises in a small frame and separates in a large
 * one without its coordinates changing.
 *
 * Every point reaches exactly one group, in the caller's own order, so a
 * `distance` of `0` or less returns the points one per group, unchanged and
 * index for index. A dot the projection drops holds its own group too, so it
 * keeps its readout row where the map draws nothing for it.
 *
 * @internal
 */
export function clusterPoints(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	distance: number,
): MapPointCluster[] {
	const groups: MapClusterSeed[] = []

	// Seeds bucketed by grid cell, one cell per merge distance: a seed within that
	// distance of a dot can only sit in the dot's own cell or one of the eight
	// around it, so each dot reads nine buckets rather than every group built so
	// far — a linear pass where the naive scan is quadratic.
	const cells = new Map<number, MapSeededCluster[]>()

	for (const [index, position] of positions.entries()) {
		const at = project(position)

		// A dot the projection drops joins nothing and is joined by nothing, and an
		// off grouping leaves every dot alone: both stay off the grid, so neither
		// can be found as a merge candidate.
		if (at === null || distance <= 0) {
			groups.push({ members: [index], seed: at, sumX: at?.x ?? 0, sumY: at?.y ?? 0 })

			continue
		}

		const cx = Math.floor(at.x / distance)

		const cy = Math.floor(at.y / distance)

		const nearest = nearestSeed(cells, at, cx, cy, distance)

		if (nearest !== null) {
			nearest.members.push(index)

			nearest.sumX += at.x

			nearest.sumY += at.y

			continue
		}

		const group: MapSeededCluster = { members: [index], seed: at, sumX: at.x, sumY: at.y }

		groups.push(group)

		bucket(cells, cellKey(cx, cy)).push(group)
	}

	// Grouping by seed leaves marks that can still cover one another, because a
	// summary draws larger the more it holds. Off, nothing merges at all, and two
	// dots the caller asked to keep apart must stay apart.
	return (distance > 0 ? consolidate(groups, distance) : groups).map(summarise)
}

/**
 * Merges the groups whose drawn marks would cover one another, until none do.
 *
 * The pass above measures dots, which are all one size. What it draws are marks
 * graded by what they hold, so two groups it left a clear gap between can still
 * overlap once drawn — and a set of dots the seed rule split across two groups
 * reads as one bunch to the eye either way. Each round folds every overlapping
 * group into the first it meets, so the count strictly falls and the rounds run
 * out; in practice one settles it.
 *
 * @internal
 */
function consolidate(groups: MapClusterSeed[], distance: number): MapClusterSeed[] {
	let held = groups

	let merging = true

	while (merging) {
		const next = mergeRound(held, distance)

		merging = next.length < held.length

		held = next
	}

	return held
}

/** One pass of {@link consolidate}: every group folded into the first it overlaps. @internal */
function mergeRound(groups: MapClusterSeed[], distance: number): MapClusterSeed[] {
	const next: MapClusterSeed[] = []

	for (const group of groups) {
		const host = next.find((other) => marksOverlap(other, group, distance))

		if (host === undefined) {
			next.push(group)

			continue
		}

		// Sorted, so the group still reports the caller's lowest index first — the
		// stop a pick names, and the ordinal an unnamed dot reads out by.
		host.members = [...host.members, ...group.members].sort((a, b) => a - b)

		host.sumX += group.sumX

		host.sumY += group.sumY
	}

	return next
}

/**
 * Whether two groups draw over one another: their centres closer than the marks
 * they paint, or than the caller's own merge gap where that is wider. The gap is
 * a floor, not a ceiling — a gap under the marks' own width would ask for dots
 * that overlap, which is the one thing this mark exists to prevent.
 *
 * @internal
 */
function marksOverlap(a: MapClusterSeed, b: MapClusterSeed, distance: number): boolean {
	const at = centre(a)

	const bt = centre(b)

	// A group the projection dropped draws nothing, so it covers nothing.
	if (at === null || bt === null) return false

	const reach = Math.max(
		distance,
		clusterRadius(a.members.length) + clusterRadius(b.members.length),
	)

	const dx = at.x - bt.x

	const dy = at.y - bt.y

	return dx * dx + dy * dy < reach * reach
}

/** Where a group draws: the mean of its members' projected positions. @internal */
function centre({ members, seed, sumX, sumY }: MapClusterSeed): MapPoint2D | null {
	return seed === null ? null : { x: sumX / members.length, y: sumY / members.length }
}

/**
 * The grid key for one cell. Packed into a number rather than a string: the scan
 * below reads nine cells per dot, and building nine strings each would allocate
 * by the thousand across a set of hundreds. Cell indices are frame coordinates
 * over the merge distance, so they sit far inside the ±32,768 the packing holds.
 *
 * @internal
 */
function cellKey(cx: number, cy: number): number {
	return cx * 65536 + cy
}

/** The seed bucket for a cell, created empty on first use. @internal */
function bucket(cells: Map<number, MapSeededCluster[]>, key: number): MapSeededCluster[] {
	const held = cells.get(key)

	if (held !== undefined) return held

	const fresh: MapSeededCluster[] = []

	cells.set(key, fresh)

	return fresh
}

/**
 * The nearest group whose seed lies within `distance` of `at`, or `null` where
 * the dot stands alone. It reads the dot's own cell and the eight around it,
 * which at one cell per merge distance is every cell a seed in reach can be in.
 * Distance is compared squared, so the scan takes no square root, and a tie keeps
 * the earlier group — the grouping then reads the same on every pass over the
 * same input.
 *
 * @internal
 */
function nearestSeed(
	cells: Map<number, MapSeededCluster[]>,
	at: MapPoint2D,
	cx: number,
	cy: number,
	distance: number,
): MapSeededCluster | null {
	const limit = distance * distance

	let nearest: MapSeededCluster | null = null

	let best = Number.POSITIVE_INFINITY

	for (let cell = 0; cell < 9; cell++) {
		const held = cells.get(cellKey(cx + ((cell % 3) - 1), cy + (Math.floor(cell / 3) - 1)))

		if (held === undefined) continue

		for (const group of held) {
			const dx = group.seed.x - at.x

			const dy = group.seed.y - at.y

			const spread = dx * dx + dy * dy

			if (spread > limit || spread >= best) continue

			best = spread

			nearest = group
		}
	}

	return nearest
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
