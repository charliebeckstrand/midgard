/**
 * What a zone is, apart from how it draws: the circle-to-polygon math a circular
 * geofence starts from, and the room the drawn zone can spare the marks standing
 * on it. One leaf at the engine root rather than a concept directory, because the
 * two are the zone's own rules and nothing else asks them — the ring's path and
 * its keyboard anchor sit with their own kin in `map-geometry/mark.ts`.
 *
 * The circle is built on `d3-geo`'s own rather than on plane trigonometry. A
 * circle on the ground is a small circle of the sphere, so a ring stepped in
 * degrees of longitude and latitude reads as an ellipse away from the equator and
 * breaks at a pole. `geoCircle` steps around the centre instead, so the ring holds
 * its shape wherever the centre sits.
 *
 * The budget is the zone half of the hit-target rule, whose other half is
 * `map-cluster/crowd.ts` and whose join is `markTargets`. All three are frame
 * arithmetic with no React in them, which is why they sit here and not beside the
 * mark that registers them.
 */

import { geoCircle } from 'd3-geo'
import {
	EARTH_RADIUS_METERS,
	GEOFENCE_CIRCLE_STEPS,
	POINT_HIT_RADIUS,
	ZONE_SPARE_FRACTION,
} from './map-constants'
import { areaReach, type MapAreaRing, ringsNear } from './map-geometry/mark'
import type { LngLat, MapPoint2D } from './types'

/** Degrees in one radian — metres of arc become the angle `geoCircle` takes. @internal */
const DEGREES_PER_RADIAN = 180 / Math.PI

/** Half the sphere in degrees: a ring this wide covers everything and has no boundary. @internal */
const HALF_SPHERE_DEGREES = 180

/**
 * A closed ring of lon/lat around a centre, every point one ground distance from
 * it. The ring repeats its first position at the end, which is what a GeoJSON
 * ring is and what {@link ringAnchor} reads.
 *
 * The radius is a ground distance in metres, measured on the mean-radius sphere
 * a cluster's span reads on, so one map never holds two ideas of how far a metre
 * is. It is not a frame distance: a geofence covers the same ground however far
 * out the map sits, where every other mark in this module holds its size in
 * device pixels.
 *
 * @param at - The circle's centre.
 * @param radius - The ground radius, in metres.
 * @returns The ring, or an empty list where the arguments describe no circle —
 * a radius at or below zero, or one that wraps the sphere. The mark draws
 * nothing from an empty ring, which is the silence a `MapRoute` with no stops
 * keeps.
 *
 * @internal
 */
export function circleRing(at: LngLat, radius: number): LngLat[] {
	if (!(radius > 0)) return []

	const degrees = (radius / EARTH_RADIUS_METERS) * DEGREES_PER_RADIAN

	if (degrees >= HALF_SPHERE_DEGREES) return []

	const { coordinates } = geoCircle()
		.center(at)
		.radius(degrees)
		// The step between adjacent ring points, in degrees of rotation about the
		// centre — so the count holds whatever the radius is.
		.precision(360 / GEOFENCE_CIRCLE_STEPS)()

	// GeoJSON positions are `number[]` to the types, and a lon/lat pair in fact;
	// `geoCircle` writes one ring, so the first is the whole shape.
	return (coordinates[0] ?? []) as LngLat[]
}

/**
 * A drawn zone as the hit-target rule reads it: the rings it paints, the reach a
 * dot competing for its ground may take, and how far outside those rings still
 * counts as competing.
 *
 * The budget is one number for the whole zone rather than a measure per dot,
 * which is the point of it — every mark on one zone points alike, whatever the
 * ring runs through. Resolving it here rather than inside the per-dot answer is
 * what makes that structural: the shape below can only be built once per zone,
 * where a per-dot resolver was free to walk every vertex again for each mark.
 *
 * @internal
 */
export type MapZoneBudget = {
	rings: readonly MapAreaRing[]
	/** What a dot on this zone may reach, in device pixels. */
	spare: number
	/** The competing band around the rings, in frame units. */
	margin: number
}

/**
 * What a zone can spare the marks that stand on it, resolved once for the whole
 * zone.
 *
 * A dot takes {@link ZONE_SPARE_FRACTION} of the zone's own inscribed room, so
 * the zone keeps at least as much as it gives — at every size, and with no
 * threshold anywhere for a reader to land on the wrong side of. The reach is a
 * device-pixel figure and the rings are frame units, so the zone's own measure
 * divides by the zoom scale on the way out.
 *
 * The competing band is a whole finger target wide, so a dot just outside a small
 * zone is budgeted too — its target would blanket that zone as surely as one
 * standing in the middle of it. Being generous there costs a dot nothing it can
 * see: a zone with room to spare hands back more than a target can use, and
 * `markTargets` caps it.
 *
 * @param rings - The zone's projected rings, from `projectArea`.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The zone's budget, ready for {@link zoneSpare} to answer per dot.
 *
 * @internal
 */
export function zoneBudget(rings: readonly MapAreaRing[], unitsPerPixel: number): MapZoneBudget {
	return {
		rings,
		spare: (areaReach(rings) / unitsPerPixel) * ZONE_SPARE_FRACTION,
		margin: POINT_HIT_RADIUS * unitsPerPixel,
	}
}

/**
 * How much reach this zone leaves a dot at a frame position: its budget where the
 * dot competes for the zone's ground, and no claim at all where it does not.
 *
 * The whole per-dot cost is the box scan, because {@link zoneBudget} has already
 * measured everything that does not depend on where the dot stands.
 *
 * @param zone - The zone's budget, from {@link zoneBudget}.
 * @param at - The dot's projected frame position.
 * @returns The reach in device pixels, `Infinity` where this zone claims nothing.
 *
 * @internal
 */
export function zoneSpare(zone: MapZoneBudget, at: MapPoint2D): number {
	return ringsNear(zone.rings, at, zone.margin) ? zone.spare : Number.POSITIVE_INFINITY
}
