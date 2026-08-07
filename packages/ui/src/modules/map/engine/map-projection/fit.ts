/**
 * The two-stage fit the map's mount rides: one measurement-free canonical fit
 * that paints on the first commit, and the measured fit derived from it by
 * arithmetic once the container is read. Keeping the second a derivation of the
 * first is what makes a resize cost no bounds pass, and what guarantees the
 * refit only sharpens strokes rather than reshaping the geography.
 */

import { type GeoProjection, geoPath } from 'd3-geo'
import { MAP_CANONICAL_WIDTH } from '../map-constants'
import type { MapFeature, MapNamedProjection, MapProjection } from '../types'
import { collection, fitMapProjection, resolveMapProjection } from './resolve'

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
 * serves both the CSS aspect reservation (through {@link mapAutoAspect} below) and the
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
