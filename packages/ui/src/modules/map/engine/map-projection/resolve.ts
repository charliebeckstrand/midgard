/**
 * Naming a projection and fitting one: the `d3-geo` boundary the rest of the
 * projection engine sits above. Everything here is the direct route — resolve
 * the spec, fit it to a frame — where `fit.ts` derives the same result by
 * arithmetic to keep a resize off it.
 */

import {
	type GeoPermissibleObjects,
	type GeoProjection,
	geoAlbersUsa,
	geoEqualEarth,
	geoMercator,
} from 'd3-geo'
import type { MapFeature, MapProjection } from '../types'

/**
 * The feature-collection wrapper d3-geo fits and measures against. The cast
 * bridges the module's minimal structural feature type to d3's GeoJSON
 * types — same shapes, stricter `geometry` unions there.
 *
 * @internal
 */
export function collection(features: MapFeature[]): GeoPermissibleObjects {
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
