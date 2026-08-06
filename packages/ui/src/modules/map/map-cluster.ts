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
 * One drawn group: the dots it stands for, where it draws, and how far they
 * spread. A group of one is an ordinary dot, so a mark draws its summaries and
 * its single dots through one path.
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
	/**
	 * The group's own position in lon/lat: a lone dot's own, or its members'
	 * spherical centroid. The keyboard cursor stands here.
	 */
	anchor: LngLat
	/**
	 * How far the group spreads, in metres: the diameter of the circle about
	 * {@link anchor} that holds every member. `0` for a lone dot.
	 */
	span: number
}

/** A group under construction: the seed the distance test measures from, and the running sum of its members. @internal */
type MapClusterSeed = {
	members: number[]
	/** The first member's projected position, `null` where the projection dropped it. */
	seed: MapPoint2D | null
	sumX: number
	sumY: number
}

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
	const cells = new Map<string, MapClusterSeed[]>()

	for (const [index, position] of positions.entries()) {
		const at = project(position)

		const nearest = at === null || distance <= 0 ? null : nearestSeed(cells, at, distance)

		if (nearest !== null && at !== null) {
			nearest.members.push(index)

			nearest.sumX += at.x

			nearest.sumY += at.y

			continue
		}

		const group: MapClusterSeed = { members: [index], seed: at, sumX: at?.x ?? 0, sumY: at?.y ?? 0 }

		groups.push(group)

		// A dot the projection drops joins nothing and is joined by nothing: it
		// holds its own group, off the grid, so it keeps a readout where the map
		// draws it nowhere. An off grouping (`distance` of `0` or less) leaves every
		// group off the grid the same way.
		if (at !== null && distance > 0) bucket(cells, cellKey(at, distance)).push(group)
	}

	return groups.map((group) => summarise(group, positions))
}

/** The grid key a frame position falls under, at one cell per merge distance. @internal */
function cellKey(at: MapPoint2D, distance: number): string {
	return `${Math.floor(at.x / distance)}:${Math.floor(at.y / distance)}`
}

/** The seed bucket for a cell, created empty on first use. @internal */
function bucket(cells: Map<string, MapClusterSeed[]>, key: string): MapClusterSeed[] {
	const held = cells.get(key)

	if (held !== undefined) return held

	const fresh: MapClusterSeed[] = []

	cells.set(key, fresh)

	return fresh
}

/**
 * The nearest group whose seed lies within `distance` of `at`, or `null` where
 * the dot stands alone. Distance is compared squared, so the scan takes no
 * square root, and a tie keeps the earlier group — the grouping then reads the
 * same on every pass over the same input.
 *
 * @internal
 */
function nearestSeed(
	cells: Map<string, MapClusterSeed[]>,
	at: MapPoint2D,
	distance: number,
): MapClusterSeed | null {
	const limit = distance * distance

	let nearest: MapClusterSeed | null = null

	let best = Number.POSITIVE_INFINITY

	for (const group of neighbourhood(cells, at, distance)) {
		if (group.seed === null) continue

		const dx = group.seed.x - at.x

		const dy = group.seed.y - at.y

		const spread = dx * dx + dy * dy

		if (spread > limit || spread >= best) continue

		best = spread

		nearest = group
	}

	return nearest
}

/** Every seed in the dot's own cell and the eight around it — the whole field a merge can reach. @internal */
function neighbourhood(
	cells: Map<string, MapClusterSeed[]>,
	at: MapPoint2D,
	distance: number,
): MapClusterSeed[] {
	const cx = Math.floor(at.x / distance)

	const cy = Math.floor(at.y / distance)

	const near: MapClusterSeed[] = []

	for (let x = cx - 1; x <= cx + 1; x++) {
		for (let y = cy - 1; y <= cy + 1; y++) {
			near.push(...(cells.get(`${x}:${y}`) ?? []))
		}
	}

	return near
}

/**
 * A group's own lon/lat: a lone dot's position, or its members' spherical
 * centroid — which a set spanning the antimeridian needs, where a mean of
 * longitudes would land on the far side of the world.
 *
 * @internal
 */
function clusterAnchor(coordinates: LngLat[]): LngLat {
	const [first] = coordinates

	if (first === undefined) return [0, 0]

	if (coordinates.length === 1) return first

	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates } as unknown as Parameters<
		typeof geoCentroid
	>[0])

	// Antipodal members cancel to no centre. The first member anchors the group
	// instead, which is a position the projection can draw.
	return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : first
}

/** The diameter, in metres, of the circle about `anchor` that holds every member. @internal */
function clusterSpan(anchor: LngLat, coordinates: LngLat[]): number {
	let radians = 0

	for (const position of coordinates) radians = Math.max(radians, geoDistance(anchor, position))

	return 2 * radians * EARTH_RADIUS_METERS
}

/** Resolves a built group to where it draws, where it anchors, and how far it spreads. @internal */
function summarise(group: MapClusterSeed, positions: readonly LngLat[]): MapPointCluster {
	const { members, seed, sumX, sumY } = group

	const coordinates: LngLat[] = []

	for (const index of members) {
		const position = positions[index]

		if (position !== undefined) coordinates.push(position)
	}

	const anchor = clusterAnchor(coordinates)

	return {
		members,
		at: seed === null ? null : { x: sumX / members.length, y: sumY / members.length },
		anchor,
		// A lone dot spans nothing, and the measure costs a call per member — so
		// the common group of one never pays for it.
		span: members.length === 1 ? 0 : clusterSpan(anchor, coordinates),
	}
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
	let radius: number = POINT_RADIUS

	for (const step of CLUSTER_RADIUS_STEPS) if (count >= step.from) radius = step.radius

	return radius
}
