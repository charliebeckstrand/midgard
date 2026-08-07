/**
 * The map's frame chrome: the graticule's meridians and parallels, and the
 * frame the projection itself draws — the globe's edge, which doubles as the
 * bound the graticule is clipped to. Both read the fitted projection alone — no
 * atlas feature reaches them — so one pass draws the pair, and both cost the
 * same whatever the geography frames: the lines span the globe and the frame
 * clips what falls outside it. Held apart from `region.ts` for that reason, and
 * memoised a layer above (`cache.ts`) like the region paths, because the pass
 * re-runs per fit.
 */

import { type GeoGeometryObjects, type GeoProjection, geoGraticule, geoPath } from 'd3-geo'
import {
	GRATICULE_MIN_STEP_DEGREES,
	GRATICULE_STEP_DEGREES,
	REGION_PATH_DIGITS,
} from '../map-constants'

/**
 * The chrome paths under one fit, `null` where a part is off or the projection
 * draws none of it. Geometry only: whether the frame is stroked as the sphere
 * outline is the view's business, so it never enters this — or the memo that
 * holds it.
 *
 * @internal
 */
export type MapChromePaths = {
	graticule: string | null
	/**
	 * The projection's own drawing frame — the globe's edge, or a composite's
	 * three clip boxes. It bounds the graticule whether or not it is drawn, so it
	 * resolves whenever any chrome does.
	 */
	frame: string | null
}

/**
 * No chrome — one shared value, so the default map (both parts off) allocates
 * nothing per fit and the layer's props hold their identity across renders.
 *
 * @internal
 */
export const EMPTY_CHROME: MapChromePaths = { graticule: null, frame: null }

/** The globe itself: the shape a projection outlines its own edge from. @internal */
const SPHERE: GeoGeometryObjects = { type: 'Sphere' }

/** A drawn `d`, or `null` where the projection drew none of the shape. */
function drawn(d: string | null): string | null {
	return d === null || d === '' ? null : d
}

/**
 * The chrome under one fit: the meridians and parallels at `step` degrees
 * (`null` where the graticule is off), and the frame the projection draws.
 *
 * The graticule serialises as one multi-line path rather than one per line, so a
 * world map's fifty-odd hairlines cost one element and one ink. Its lines cover
 * the globe whatever the geography frames — a regional map draws the same set
 * and clips the rest at the viewBox — so the pass costs what it costs on a world
 * map, which is why it is opt-in and memoised.
 *
 * The frame is the globe's edge where the projection has one, and a composite's
 * three clip boxes where it has none — under `albers-usa` the lower-48 box and
 * the two inset boxes, in that order. It serves twice. Stroked, it is the sphere
 * outline a whole-world map closes its frame with. Unstroked, it bounds the
 * graticule: the composite streams the lines through all three of its
 * sub-projections, so each inset fills with fragments at its own angle, and
 * clipping to this path under the even-odd rule — where the inset boxes read as
 * holes in the outer one — leaves the main map ruled and every inset clear. One
 * path, so the bound and the outline can never disagree about where the
 * projection draws.
 *
 * Both parts ride one `geoPath`, whose one decimal is the region paths': chrome
 * draws in the same frame units, where a second decimal serialises detail no
 * display resolves.
 *
 * @internal
 */
export function chromePaths(projection: GeoProjection, step: number | null): MapChromePaths {
	const path = geoPath(projection).digits(REGION_PATH_DIGITS)

	return {
		graticule: step === null ? null : drawn(path(geoGraticule().step([step, step])())),
		frame: drawn(path(SPHERE)),
	}
}

/**
 * The graticule's degree step from the prop: `null` where it is off, and
 * otherwise a step floored at {@link GRATICULE_MIN_STEP_DEGREES} — the lines
 * cover the globe, so a step below a degree asks for millions of points the
 * frame then clips away.
 *
 * @internal
 */
export function graticuleStep(graticule: boolean | number): number | null {
	if (graticule === false) return null

	// `true` takes the default, and so does a non-finite step: that one would
	// reach `d3.range` as an unbounded line count.
	if (graticule === true || !Number.isFinite(graticule)) return GRATICULE_STEP_DEGREES

	return Math.max(graticule, GRATICULE_MIN_STEP_DEGREES)
}
