/**
 * The map's frame chrome: the graticule's meridians and parallels, and the
 * sphere outline a whole-globe map closes its frame with. Both read the fitted
 * projection alone — no atlas feature reaches them — so one fit draws the pair,
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
	sphere: string | null
}

/**
 * No chrome — one shared value, so the default map (both parts off) allocates
 * nothing per fit and the layer's props hold their identity across renders.
 *
 * @internal
 */
export const EMPTY_CHROME: MapChromePaths = { graticule: null, sphere: null }

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
 * The sphere outline under the fitted projection: the globe's own edge, which a
 * whole-world map rules to close its frame. A composite projection has no
 * single edge, so `albers-usa` outlines its own clip frames instead — the
 * lower-48 box and the two inset boxes.
 *
 * @internal
 */
export function spherePath(projection: GeoProjection): string | null {
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
