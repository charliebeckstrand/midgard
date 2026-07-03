/**
 * Pure geometry plumbing for the map module: TopoJSON / GeoJSON
 * normalisation, region path generation, and lon/lat projection for the
 * overlay marks. Kept React-free beside `map-projection.ts` so the math is
 * unit-testable in isolation.
 */

import { type GeoPermissibleObjects, type GeoProjection, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { REGION_PATH_DIGITS } from './map-constants'
import type { LngLat, MapFeature, MapGeography } from './types'

/** A projected frame point for the overlay marks. @internal */
export type MapPoint2D = {
	x: number
	y: number
}

/**
 * Normalises prop-supplied geography to a flat feature list: a TopoJSON
 * topology decodes its named object (defaulting to the first key — atlas
 * packages lead with their primary layer), a GeoJSON collection passes its
 * features through. An unknown object name yields no features.
 *
 * @internal
 */
export function geographyFeatures(geography: MapGeography, objectName?: string): MapFeature[] {
	if (geography.type === 'FeatureCollection') return geography.features

	const name = objectName ?? Object.keys(geography.objects)[0]

	const object = name === undefined ? undefined : geography.objects[name]

	if (!object) return []

	const decoded = feature(
		geography as unknown as Parameters<typeof feature>[0],
		object as Parameters<typeof feature>[1],
	)

	return (decoded.type === 'FeatureCollection'
		? decoded.features
		: [decoded]) as unknown as MapFeature[]
}

/**
 * Each region's SVG path under the fitted projection, index-aligned with the
 * features; `null` where a feature has no drawable geometry.
 *
 * @internal
 */
export function regionPaths(features: MapFeature[], projection: GeoProjection): (string | null)[] {
	const path = geoPath(projection).digits(REGION_PATH_DIGITS)

	return features.map((entry) =>
		entry.geometry === null ? null : path(entry as GeoPermissibleObjects),
	)
}

/**
 * Projects one lon/lat to frame coordinates, or `null` where the projection
 * has no image for it — the US composite drops points outside its insets.
 *
 * @internal
 */
export function projectPoint(projection: GeoProjection, position: LngLat): MapPoint2D | null {
	const projected = projection(position)

	return projected === null ? null : { x: projected[0], y: projected[1] }
}

/**
 * A polyline's SVG path through the projected points, skipping any the
 * projector drops; empty when fewer than two survive. Takes the projector as
 * a closure — the shape {@link MapPlat} provides its overlays through
 * context.
 *
 * @internal
 */
export function linePath(
	points: LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
): string {
	const projected = points.flatMap((point) => {
		const at = project(point)

		return at ? [at] : []
	})

	if (projected.length < 2) return ''

	return projected
		.map((at, index) => `${index === 0 ? 'M' : 'L'}${round(at.x)},${round(at.y)}`)
		.join('')
}

/** Two-decimal rounding keeping path strings compact. @internal */
function round(value: number): number {
	return Math.round(value * 100) / 100
}
