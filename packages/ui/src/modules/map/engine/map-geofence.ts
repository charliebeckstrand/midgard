/**
 * The circle-to-polygon math a circular geofence draws from: a centre and a
 * ground radius become a closed ring of lon/lat, which the mark then projects
 * like any other ring. One leaf at the engine root rather than a concept
 * directory, because the conversion is the whole concept — the ring's path and
 * its keyboard anchor sit with their own kin in `map-geometry/mark.ts`.
 *
 * Built on `d3-geo`'s own circle rather than on plane trigonometry. A circle on
 * the ground is a small circle of the sphere, so a ring stepped in degrees of
 * longitude and latitude reads as an ellipse away from the equator and breaks at
 * a pole. `geoCircle` steps around the centre instead, so the ring holds its
 * shape wherever the centre sits.
 */

import { geoCircle } from 'd3-geo'
import { EARTH_RADIUS_METERS, GEOFENCE_CIRCLE_STEPS } from './map-constants'
import type { LngLat } from './types'

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
