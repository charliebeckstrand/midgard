/**
 * Pure projection plumbing for the map module: named-projection resolution,
 * fitting to the frame, the geography's own aspect ratio for `'auto'` sizing,
 * and the frame-sizing resolution. Kept React-free beside `map-geometry.ts`
 * so the math is unit-testable in isolation.
 */

import {
	type GeoPermissibleObjects,
	type GeoProjection,
	geoAlbersUsa,
	geoEqualEarth,
	geoMercator,
	geoPath,
} from 'd3-geo'
import type { FrameSizing } from '../../primitives/plot'
import { DEFAULT_MAP_ASPECT } from './map-constants'
import type { MapAspectRatio, MapFeature, MapProjection } from './types'

/**
 * The feature-collection wrapper d3-geo fits and measures against. The cast
 * bridges the module's minimal structural feature type to d3's GeoJSON
 * types — same shapes, stricter `geometry` unions there.
 *
 * @internal
 */
function collection(features: MapFeature[]): GeoPermissibleObjects {
	return { type: 'FeatureCollection', features } as unknown as GeoPermissibleObjects
}

/**
 * Resolves a {@link MapProjection} to a d3-geo instance: a fresh projection
 * for the built-in names, the instance itself when one is passed — d3
 * projections are stateful, so fitting mutates a passed instance in place.
 *
 * @internal
 */
export function resolveMapProjection(spec: MapProjection): GeoProjection {
	if (spec === 'mercator') return geoMercator()

	if (spec === 'albers-usa') return geoAlbersUsa()

	if (spec === 'equal-earth') return geoEqualEarth()

	return spec
}

/**
 * Resolves and fits a projection so the geography fills a `width` × `height`
 * frame. With no features the projection returns unfitted — there is nothing
 * to frame.
 *
 * @internal
 */
export function fitMapProjection(
	spec: MapProjection,
	features: MapFeature[],
	width: number,
	height: number,
): GeoProjection {
	const projection = resolveMapProjection(spec)

	if (features.length === 0 || width <= 0 || height <= 0) return projection

	return projection.fitSize([width, height], collection(features))
}

/**
 * The geography's own projected aspect ratio (`width / height`), for
 * `aspectRatio: 'auto'`: the features are fit to a fixed width and their
 * projected bounds measured. Pure and synchronous, so the CSS aspect box is
 * reservable before the frame's width is; `null` with nothing to measure.
 *
 * @internal
 */
export function mapAutoAspect(spec: MapProjection, features: MapFeature[]): number | null {
	if (features.length === 0) return null

	const shape = collection(features)

	const projection = resolveMapProjection(spec).fitWidth(1000, shape)

	const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(shape)

	const boundsHeight = y1 - y0

	return boundsHeight > 0 ? (x1 - x0) / boundsHeight : null
}

/** Parses a {@link MapAspectRatio} to its numeric `width / height`, or `null` when free-form. @internal */
function ratioValue(ratio: number | `${number}/${number}` | false): number | null {
	if (ratio === false) return null

	if (typeof ratio === 'number') return ratio > 0 ? ratio : null

	const [w, h] = ratio.split('/').map(Number)

	return w && h && h > 0 ? w / h : null
}

/**
 * Resolves the map frame's sizing policy, the chart contract with an `'auto'`
 * branch: an explicit `height` always wins as a fixed pixel box; `'auto'`
 * derives from the geography's own projected ratio (from
 * {@link mapAutoAspect}, with a wide fallback when there is nothing to
 * measure), so it never falls through to `fill`; a numeric or `"w/h"` ratio
 * reserves that; `false` leaves the frame free-form to fill its container.
 *
 * @internal
 */
export function mapFrameSizing(
	height: number | undefined,
	aspectRatio: MapAspectRatio,
	autoAspect: number | null,
): FrameSizing {
	if (height !== undefined) return { mode: 'fixed', height }

	const ratio =
		aspectRatio === 'auto' ? (autoAspect ?? DEFAULT_MAP_ASPECT) : ratioValue(aspectRatio)

	return ratio === null ? { mode: 'fill' } : { mode: 'aspect', ratio }
}
