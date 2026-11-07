/**
 * What a cluster reads out on the ground: where the group sits in lon/lat, and
 * how far its stops spread in meters. Held apart from `group.ts`, which
 * carries frame arithmetic alone. This half is spherical, costs a `d3-geo`
 * pass per group, and is wanted by one caller each. It therefore resolves where
 * it is read, rather than on every grouping pass.
 */

import { geoCentroid, geoDistance } from 'd3-geo'
import { EARTH_RADIUS_METERS } from '../map-constants'
import type { LngLat } from '../types'

/** The members' own coordinates. Every index came from `positions`, so the read holds no gaps. @internal */
function clusterCoordinates(members: readonly number[], positions: readonly LngLat[]): LngLat[] {
	return members.map((index) => positions[index] as LngLat)
}

/**
 * The spherical centroid of a group's members, or `null` where antipodal
 * members cancel to no center. A set across the antimeridian needs this
 * centroid, where a mean of longitudes would land on the far side of the world.
 *
 * @internal
 */
function sphericalCenter(coordinates: LngLat[]): LngLat | null {
	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates })

	return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
}

/**
 * A group's own lon/lat: a lone dot's position, or the member nearest the
 * members' spherical centroid.
 *
 * A member, not the centroid itself, because the anchor must be a position
 * that the projection can draw. Under `albers-usa` a group can hold the dots of
 * two insets that stand close in the frame. Their centroid then lies in ground
 * that the composite does not draw. A summary anchored there has no keyboard
 * stop and leaves the dot pool. Where antipodal members cancel to no center,
 * the first member anchors the group.
 *
 * @internal
 */
export function clusterAnchor(members: readonly number[], positions: readonly LngLat[]): LngLat {
	const coordinates = clusterCoordinates(members, positions)

	const first = coordinates[0] as LngLat

	if (coordinates.length === 1) return first

	const center = sphericalCenter(coordinates)

	if (center === null) return first

	let nearest = first

	let best = Number.POSITIVE_INFINITY

	for (const position of coordinates) {
		const distance = geoDistance(center, position)

		if (distance < best) {
			best = distance

			nearest = position
		}
	}

	return nearest
}

/**
 * How far a group spreads, in meters: the diameter of the circle about its
 * members' spherical centroid that holds every member. `0` for a lone dot,
 * which spreads over nothing and must not pay a spherical pass to say so.
 *
 * About the centroid rather than about the {@link clusterAnchor}, so the span
 * reads the spread of the stops and not the place where the summary draws.
 * Where antipodal members cancel to no center, the first member is the center.
 *
 * @internal
 */
export function clusterSpan(members: readonly number[], positions: readonly LngLat[]): number {
	if (members.length === 1) return 0

	const coordinates = clusterCoordinates(members, positions)

	const center = sphericalCenter(coordinates) ?? (coordinates[0] as LngLat)

	let radians = 0

	for (const position of coordinates) {
		radians = Math.max(radians, geoDistance(center, position))
	}

	return 2 * radians * EARTH_RADIUS_METERS
}
