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
import type { MapFeature, MapProjection } from '../types'
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
 * The measured fit: the transform that puts the canonical frame in a `width` ×
 * `height` box. It is the scale that meets the box less {@link MAP_FIT_INSET}
 * on each side, and the offset that centers the remainder. Inside the inset,
 * this is the SVG default, `preserveAspectRatio="xMidYMid meet"`. Before the box
 * is measured, the plat draws the canonical frame in an SVG that the inset
 * holds off each edge of the box. The server paint and the measured frame
 * therefore put the geography in the same place.
 *
 * Each projection keeps its canonical fit, and this transform carries its
 * output: the region paths on one group, each mark position through
 * `applyTransform`, and the chrome through its stream. The output of a
 * projection is linear in its scale and its translate, so the transform puts
 * each position where a fit to the box puts it. No reader holds a second
 * projection. A passed d3 instance, which the module cannot copy, takes the
 * same route as a named one.
 *
 * `null` when there is nothing to frame. That is no canonical fit (no
 * geography, or bounds that collapse), or a box with no area inside the inset,
 * such as an unmeasured one.
 *
 * @internal
 */
export function measuredMapFit(
	canonical: MapCanonicalFit | null,
	width: number,
	height: number,
): MapTransform | null {
	if (canonical === null) return null

	const k = Math.min(
		(width - MAP_FIT_INSET * 2) / canonical.width,
		(height - MAP_FIT_INSET * 2) / canonical.height,
	)

	if (!(k > 0)) return null

	return { x: (width - canonical.width * k) / 2, y: (height - canonical.height * k) / 2, k }
}
