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
import type { FrameSizing } from '../../hooks'
import { ALBERS_USA_ASPECT, DEFAULT_MAP_ASPECT, MAP_CANONICAL_WIDTH } from './map-constants'
import type { MapAspectRatio, MapFeature, MapNamedProjection, MapProjection } from './types'

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
 * A projection fit to the canonical {@link MAP_CANONICAL_WIDTH}-wide frame,
 * with the frame it fills. @internal
 */
export type MapCanonicalFit = {
	/** The fitted projection, ready to draw the neutral geography. */
	projection: GeoProjection
	/** Frame width in projected units — the canonical width, barring degenerate geometry. */
	width: number
	/** Frame height in projected units, from the fitted geography's bounds. */
	height: number
	/** The frame's `width / height`. */
	aspect: number
}

/**
 * Fits the projection once to a fixed {@link MAP_CANONICAL_WIDTH}-wide frame and
 * measures the fitted bounds. `fitWidth` aligns those bounds to the frame's
 * top-left, so the returned `width` × `height` is a clean viewBox the geography
 * fills. Pure and synchronous — no container measurement — so the same fit
 * serves both the CSS aspect reservation (through {@link mapAutoAspect}) and the
 * geography's first, measurement-free paint. `null` with nothing to fit.
 *
 * @internal
 */
export function canonicalFit(spec: MapProjection, features: MapFeature[]): MapCanonicalFit | null {
	if (features.length === 0) return null

	const shape = collection(features)

	const projection = resolveMapProjection(spec).fitWidth(MAP_CANONICAL_WIDTH, shape)

	const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(shape)

	const width = x1 - x0

	const height = y1 - y0

	if (width <= 0 || height <= 0) return null

	return { projection, width, height, aspect: width / height }
}

/**
 * The measured-frame fit derived from a {@link canonicalFit} by arithmetic
 * alone. The named projections' output is linear in `scale` and `translate`
 * (the composite `albers-usa` derives its inset offsets and clips from them
 * proportionally), so scaling the canonical parameters by the frame factor and
 * centring the remainder frames the geography the way `fitSize` would — without
 * the bounds pass that re-projects every coordinate, the bulk of a refit's cost
 * on every resize. It lands within `fitSize`'s adaptive-resampling margin
 * (sub-percent: `fitSize` measures bounds at its probe scale, the canonical fit
 * at drawing scale), and under the canonical aspect it is a pure zoom of the
 * canonical paint, so a refit never reshapes the geography. Only the named
 * projections qualify: a passed d3 instance is stateful, so its canonical fit
 * is never cached to derive from.
 *
 * @internal
 */
export function scaleCanonicalFit(
	spec: MapNamedProjection,
	canonical: MapCanonicalFit,
	width: number,
	height: number,
): GeoProjection {
	const factor = Math.min(width / canonical.width, height / canonical.height)

	const [tx, ty] = canonical.projection.translate()

	return resolveMapProjection(spec)
		.scale(canonical.projection.scale() * factor)
		.translate([
			tx * factor + (width - canonical.width * factor) / 2,
			ty * factor + (height - canonical.height * factor) / 2,
		])
}

/**
 * The measured-frame fit, or `null` when there is nothing to frame: no
 * geography, geometry whose bounds collapse (a lone point — the canonical fit is
 * already `null` for both), or an unmeasured frame. Gating on the canonical fit
 * keeps a degenerate atlas from reaching {@link fitMapProjection}, whose
 * `fitSize` would return an infinite-scale projection that emits `NaN`
 * coordinates. A named projection derives the fit from the cached canonical one
 * by arithmetic ({@link scaleCanonicalFit}); a passed instance fits directly.
 *
 * @internal
 */
export function measuredMapFit(
	projection: MapProjection,
	features: MapFeature[],
	canonical: MapCanonicalFit | null,
	width: number,
	height: number,
): GeoProjection | null {
	if (canonical === null || width <= 0 || height <= 0) return null

	return typeof projection === 'string'
		? scaleCanonicalFit(projection, canonical, width, height)
		: fitMapProjection(projection, features, width, height)
}

/**
 * The geography's own projected aspect ratio (`width / height`), for
 * `aspectRatio: 'auto'`: the {@link canonicalFit}'s fitted bounds. Pure and
 * synchronous, so the CSS aspect box is reservable before the frame's width is;
 * `null` with nothing to measure.
 *
 * @internal
 */
export function mapAutoAspect(spec: MapProjection, features: MapFeature[]): number | null {
	return canonicalFit(spec, features)?.aspect ?? null
}

/**
 * The aspect a named projection reserves before its geography loads, for a
 * projection whose geographic subject is fixed: `albers-usa` is the United
 * States, so its frame holds the US ratio through a lazy load and never shifts
 * height. The world projections (`mercator`, `equal-earth`) and a passed
 * instance frame arbitrary geography, so they have none — the caller falls back
 * to the generic {@link DEFAULT_MAP_ASPECT}.
 *
 * @internal
 */
export function projectionFallbackAspect(spec: MapProjection): number | null {
	return spec === 'albers-usa' ? ALBERS_USA_ASPECT : null
}

/** Parses a {@link MapAspectRatio} to its numeric `width / height`, or `null` when free-form. @internal */
export function ratioValue(ratio: number | `${number}/${number}` | false): number | null {
	if (ratio === false) return null

	if (typeof ratio === 'number') return ratio > 0 ? ratio : null

	const [w, h] = ratio.split('/').map(Number)

	// Both terms must be present and positive: the type admits a signed
	// `${number}`, so `"-4/3"` would otherwise yield a negative ratio — an invalid
	// CSS `aspect-ratio` — where the numeric branch rejects the same value.
	return w !== undefined && h !== undefined && w > 0 && h > 0 ? w / h : null
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
