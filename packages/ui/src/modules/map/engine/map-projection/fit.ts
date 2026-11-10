/**
 * The two-stage fit the map's mount rides. One measurement-free canonical fit
 * paints on the first commit. The measured fit derives from it by arithmetic,
 * once the container is read. Keeping the second a derivation of the first is
 * what makes a resize cost no bounds pass. It also guarantees the refit only
 * sharpens strokes, rather than reshaping the geography.
 */

import type { GeoProjection } from 'd3-geo'
import { MAP_CANONICAL_WIDTH, MAP_FIT_INSET } from '../map-constants'
import type { MapTransform } from '../map-zoom/transform'
import type { MapFeature, MapNamedProjection, MapProjection } from '../types'
import { collection, fitProjectionWidth, resolveProjection } from './resolve'

/**
 * A projection fit to the canonical {@link MAP_CANONICAL_WIDTH}-wide frame,
 * with the frame it fills. @internal
 */
export type MapCanonicalFit = {
	/** The fitted projection, ready to draw the neutral geography. */
	projection: GeoProjection
	/** Frame width in projected units; always {@link MAP_CANONICAL_WIDTH}, which the fit maps the geography onto exactly. */
	width: number
	/** Frame height in projected units, from the fitted geography's bounds. */
	height: number
	/** The frame's `width / height`. */
	aspect: number
}

/**
 * Fits the projection once to a fixed {@link MAP_CANONICAL_WIDTH}-wide frame,
 * and reports the frame it fills, aligned to that frame's top-left. The returned
 * `width` × `height` is therefore a clean viewBox the geography fills. Pure and
 * synchronous (no container measurement), so the same fit
 * serves both the CSS aspect reservation (through {@link MapCanonicalFit.aspect})
 * and the geography's first, measurement-free paint. `null` with nothing to fit.
 *
 * @internal
 */
export function canonicalFit(spec: MapProjection, features: MapFeature[]): MapCanonicalFit | null {
	if (features.length === 0) return null

	const projection = resolveProjection(spec)

	const height = fitProjectionWidth(projection, collection(features), MAP_CANONICAL_WIDTH)

	if (height === null) return null

	return {
		projection,
		width: MAP_CANONICAL_WIDTH,
		height,
		aspect: MAP_CANONICAL_WIDTH / height,
	}
}

/**
 * The transform that puts the canonical frame in a `width` × `height` box: the
 * scale that meets the box less {@link MAP_FIT_INSET} on each side, and the
 * offset that centers the remainder. Inside the inset, this is the SVG default,
 * `preserveAspectRatio="xMidYMid meet"`. Before the box is measured, the plat
 * draws the canonical frame in an SVG that the inset holds off each edge of
 * the box. The server paint and the measured frame therefore put the geography
 * in the same place.
 *
 * `null` where the box less the inset has no area: there is no room for the
 * geography.
 *
 * @internal
 */
function canonicalFrame(
	canonical: MapCanonicalFit,
	width: number,
	height: number,
): MapTransform | null {
	const k = Math.min(
		(width - MAP_FIT_INSET * 2) / canonical.width,
		(height - MAP_FIT_INSET * 2) / canonical.height,
	)

	if (!(k > 0)) return null

	return { x: (width - canonical.width * k) / 2, y: (height - canonical.height * k) / 2, k }
}

/**
 * The canonical projection carried onto `frame`: its scale and its translate,
 * scaled by `k` and moved by the offset, on a fresh instance of `spec`.
 *
 * The output of a named projection is linear in `scale` and `translate`. The
 * composite `albers-usa` derives its inset offsets and clips from them
 * proportionally. A scale of the canonical parameters by the
 * {@link canonicalFrame} therefore frames the geography the way `fitExtent`
 * does over the box less {@link MAP_FIT_INSET} on each side. It takes no bounds
 * pass that re-projects every coordinate, the bulk of the cost of a direct fit.
 *
 * It lands within `fitExtent`'s adaptive-resampling margin, sub-percent, from the
 * resampling each pass runs at its own scale. Under the canonical aspect it is a
 * pure zoom of the canonical paint, so a refit never reshapes the geography.
 */
function carriedProjection(
	spec: MapNamedProjection,
	canonical: MapCanonicalFit,
	{ x, y, k }: MapTransform,
): GeoProjection {
	const [tx, ty] = canonical.projection.translate()

	return resolveProjection(spec)
		.scale(canonical.projection.scale() * k)
		.translate([tx * k + x, ty * k + y])
}

/**
 * A measured fit: the projection, and the two transforms that put a drawing on
 * the measured frame. Both come from one {@link canonicalFrame}, so the
 * projection and the carried paths cannot disagree.
 *
 * @internal
 */
type MapMeasuredFit = {
	projection: GeoProjection
	/**
	 * Carries the output of {@link projection} onto the measured frame. `null`
	 * where the projection draws in the measured frame itself.
	 */
	frame: MapTransform | null
	/**
	 * Carries the canonical frame onto the measured frame. The region layer draws
	 * the canonical paths under it, so a refit moves one attribute.
	 */
	carry: MapTransform
}

/**
 * The measured-frame fit, or `null` when there is nothing to frame. That is no
 * geography, geometry whose bounds collapse (a lone point), or a frame with no
 * area inside {@link MAP_FIT_INSET}, such as an unmeasured frame. The canonical
 * fit is already `null` for the first two.
 *
 * A named projection derives a new projection from the canonical one
 * ({@link carriedProjection}). A passed d3 instance belongs to the consumer, and
 * the module cannot make a copy of it. Thus it keeps its canonical fit, and the
 * {@link canonicalFrame} carries its output onto the measured frame. A refit in
 * place would give the canonical fit and the measured fit one identity. Then a
 * memo that keys on the projection, as the React Compiler does, keeps the
 * values of the first fit.
 *
 * @internal
 */
export function measuredMapFit(
	projection: MapProjection,
	canonical: MapCanonicalFit | null,
	width: number,
	height: number,
): MapMeasuredFit | null {
	if (canonical === null) return null

	const frame = canonicalFrame(canonical, width, height)

	if (frame === null) return null

	return typeof projection === 'string'
		? { projection: carriedProjection(projection, canonical, frame), frame: null, carry: frame }
		: { projection: canonical.projection, frame, carry: frame }
}
