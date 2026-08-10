/**
 * What a cluster reads out on the ground: where the group sits in lon/lat, and
 * how far its stops spread in metres. Held apart from `group.ts`, which
 * carries frame arithmetic alone — this half is spherical, costs a `d3-geo`
 * pass per group, and is wanted by one caller each, so it resolves where it is
 * read rather than on every grouping pass.
 */

import { geoCentroid, geoDistance } from 'd3-geo'
import { EARTH_RADIUS_METERS } from '../map-constants'
import type { LngLat } from '../types'

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

	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates })

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
