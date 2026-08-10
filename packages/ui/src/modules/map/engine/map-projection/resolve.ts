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
	geoPath,
} from 'd3-geo'
import type { MapFeature, MapProjection } from '../types'

/**
 * The scale d3's own `fit*` helpers measure at before they derive the fitted
 * parameters. Any fixed scale would do — the arithmetic below divides it back
 * out — so this is d3's number rather than a figure of the map's own.
 */
const PROBE_SCALE = 150

/**
 * The feature-collection wrapper d3-geo fits and measures against. The cast
 * bridges the module's minimal structural feature type to d3's own: the
 * geometry is d3's union already, but `MapFeature` leaves `properties`
 * optional where `ExtendedFeature` requires it, which is what still parts the
 * two.
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

/**
 * Fits `projection` so the geography spans `width` exactly, aligned to the
 * frame's top-left, and reports the height that frame comes to. `null` where
 * the bounds collapse on either axis — no geography, or a lone point.
 *
 * d3's `fitWidth` runs one probe pass to measure the geography and then keeps
 * only the scale and translate it derives, so a caller that needs the frame as
 * well as the fit had to project every coordinate a second time to read the
 * height back off the drawn map. This takes the probe pass itself and applies
 * the same arithmetic, which halves the cost of a fit on the mount path. The
 * frame is therefore measured at {@link PROBE_SCALE} rather than at drawing
 * scale, where adaptive resampling refines a curve differently; the two agree
 * to the last bit on a real atlas, and `scaleCanonicalFit` (`fit.ts`) already
 * accepts a divergence of that kind by name.
 *
 * The clip extent is saved and restored around the pass, as d3's own `fit`
 * does: a projection a consumer clipped to some frame would otherwise report
 * that frame's bounds rather than the geography's. `albers-usa` carries no
 * `clipExtent` method at all — its composite derives the inset clips from the
 * scale and translate proportionally — so the guard tests the method rather
 * than its value.
 *
 * @internal
 */
export function fitProjectionWidth(
	projection: GeoProjection,
	shape: GeoPermissibleObjects,
	width: number,
): number | null {
	const clip = projection.clipExtent?.() ?? null

	projection.scale(PROBE_SCALE).translate([0, 0])

	if (clip !== null) projection.clipExtent(null)

	const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(shape)

	if (clip !== null) projection.clipExtent(clip)

	const spanX = x1 - x0

	const spanY = y1 - y0

	if (spanX <= 0 || spanY <= 0) return null

	const k = width / spanX

	// d3's `fitWidth` arithmetic: the scale carries the probe factor, the
	// horizontal translate centres the span in the frame, and the vertical one
	// lifts the geography's top edge onto y 0.
	projection.scale(PROBE_SCALE * k).translate([(width - k * (x1 + x0)) / 2, -k * y0])

	return spanY * k
}
