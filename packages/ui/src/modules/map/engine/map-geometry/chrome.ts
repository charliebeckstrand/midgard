/**
 * The map's frame chrome: the graticule's meridians and parallels, and the
 * frame the projection itself draws — the globe's edge, which doubles as the
 * bound the graticule is clipped to. Both read the fitted projection alone — no
 * atlas feature reaches them — so one fit draws the pair,
 * and both cost the same whatever the geography frames: the lines span the
 * globe and the frame clips what falls outside it. Held apart from `region.ts`
 * for that reason, and memoised a layer above (`cache.ts`) like the region
 * paths, because both passes re-run per fit.
 */

import { type GeoGeometryObjects, type GeoProjection, geoGraticule, geoPath } from 'd3-geo'
import {
	GRATICULE_MIN_STEP_DEGREES,
	GRATICULE_STEP_DEGREES,
	REGION_PATH_DIGITS,
} from '../map-constants'

/**
 * The chrome paths under one fit, `null` where a part is off or the projection
 * draws none of it.
 *
 * @internal
 */
export type MapChromePaths = {
	graticule: string | null
	/**
	 * The projection's own drawing frame — the globe's edge, or a composite's
	 * three clip boxes. It bounds the graticule whether or not it is drawn, so it
	 * resolves whenever either part is on.
	 */
	frame: string | null
	/** Whether the frame draws as the sphere outline, or only bounds the graticule. */
	outline: boolean
}

/**
 * No chrome — one shared value, so the default map (both parts off) allocates
 * nothing per fit and the layer's props hold their identity across renders.
 *
 * @internal
 */
export const EMPTY_CHROME: MapChromePaths = { graticule: null, frame: null, outline: false }

/** The globe itself: the shape a projection outlines its own edge from. @internal */
const SPHERE: GeoGeometryObjects = { type: 'Sphere' }

/**
 * One chrome shape's `d` under the fitted projection; `null` where the
 * projection draws none of it. Keeps the region paths' one decimal — chrome
 * draws in the same frame units, where a second decimal serialises detail no
 * display resolves.
 */
function chromePath(projection: GeoProjection, shape: GeoGeometryObjects): string | null {
	const d = geoPath(projection).digits(REGION_PATH_DIGITS)(shape)

	return d === null || d === '' ? null : d
}

/**
 * The meridians and parallels at `step` degrees, under the fitted projection.
 * One path rather than one per line: the whole graticule serialises as a single
 * multi-line `d`, so a world map's fifty-odd hairlines cost one element and one
 * ink.
 *
 * The lines cover the globe whatever the geography frames — a regional map
 * draws the same set and clips the rest at the viewBox — so the pass costs what
 * it costs on a world map, which is why it is opt-in and memoised.
 *
 * @internal
 */
export function graticulePath(projection: GeoProjection, step: number): string | null {
	return chromePath(projection, geoGraticule().step([step, step])())
}

/**
 * The projection's own drawing frame, from the globe itself: the sphere's edge
 * where the projection has one, and a composite's three clip boxes where it has
 * none — under `albers-usa` the lower-48 box and the two inset boxes, in that
 * order.
 *
 * It serves twice. Stroked, it is the sphere outline a whole-world map closes
 * its frame with. Unstroked, it bounds the graticule: the composite streams the
 * lines through all three of its sub-projections, so each inset fills with
 * fragments at its own angle, and clipping to this path under the even-odd rule
 * — where the inset boxes read as holes in the outer one — leaves the main map
 * ruled and every inset clear. One path, so the bound and the outline can never
 * disagree about where the projection draws.
 *
 * @internal
 */
export function framePath(projection: GeoProjection): string | null {
	return chromePath(projection, SPHERE)
}

/**
 * The graticule's degree step from the prop: `null` where it is off, the
 * default step where it is on without one, and a given step floored at
 * {@link GRATICULE_MIN_STEP_DEGREES} — the lines cover the globe, so a step
 * below a degree asks for millions of points the frame then clips away.
 *
 * @internal
 */
export function graticuleStep(graticule: boolean | number | undefined): number | null {
	if (graticule === undefined || graticule === false) return null

	if (graticule === true) return GRATICULE_STEP_DEGREES

	// A non-finite step reaches `d3.range` as an unbounded line count; take the
	// default rather than hang on it.
	if (!Number.isFinite(graticule)) return GRATICULE_STEP_DEGREES

	return Math.max(graticule, GRATICULE_MIN_STEP_DEGREES)
}
