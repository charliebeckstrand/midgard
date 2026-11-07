/**
 * The map's frame chrome: the graticule's meridians and parallels, and the
 * frame the projection itself draws. That frame is the globe's edge, which
 * doubles as the bound the graticule is clipped to. Both read the fitted
 * projection and the viewBox alone, and no atlas feature reaches them. One pass
 * therefore draws the pair. The lines span the part of the globe that the
 * viewBox shows, and the frame clips what falls outside it. Held apart from
 * `region.ts` for that reason, and memoized a layer above (`cache.ts`) like the
 * region paths, because the pass re-runs per fit.
 */

import {
	type GeoGeometryObjects,
	type GeoPath,
	type GeoProjection,
	type GeoStreamWrapper,
	geoGraticule,
	geoPath,
	geoTransform,
} from 'd3-geo'
import {
	GRATICULE_MIN_STEP_DEGREES,
	GRATICULE_STEP_DEGREES,
	REGION_PATH_DIGITS,
} from '../map-constants'
import {
	invertTransform,
	MAP_FIT_TRANSFORM,
	type MapTransform,
	type MapViewFrame,
} from '../map-zoom/transform'
import type { LngLat, MapPoint2D } from '../types'
import { projectPoint, unprojectPoint } from './mark'

/**
 * The chrome paths under one fit, `null` where a part is off or the projection
 * draws none of it. Geometry only: whether the frame is stroked as the sphere
 * outline is the view's business. It never enters this, or the memo that
 * holds it.
 *
 * @internal
 */
export type MapChromePaths = {
	graticule: string | null
	/**
	 * The projection's own drawing frame: the globe's edge, or a composite's
	 * three clip boxes. It bounds the graticule whether or not it is drawn, so it
	 * resolves whenever any chrome does.
	 */
	frame: string | null
}

/**
 * No chrome: one shared value, so the default map (both parts off) allocates
 * nothing per fit and the layer's props hold their identity across renders.
 *
 * @internal
 */
export const EMPTY_CHROME: MapChromePaths = { graticule: null, frame: null }

/** The globe itself: the shape a projection outlines its own edge from. @internal */
const SPHERE: GeoGeometryObjects = { type: 'Sphere' }

/** A box in degrees: `[[west, south], [east, north]]`, the form `geoGraticule` takes. */
type GeoExtent = [[number, number], [number, number]]

/**
 * The segments that the bound reads on each edge of the view. The extent of
 * longitude and latitude over the view falls on its edges (see
 * {@link graticuleBound}). A conic bends each edge through a degree or two.
 * Thirty-two segments put a point near the crest of each bend.
 */
const BOUND_SAMPLES = 32

/**
 * How far, in degrees, the bound reaches past the extent that its points read.
 * It covers what a bend hides between two points, which is a small fraction of
 * this. It is also half the finest step ({@link GRATICULE_MIN_STEP_DEGREES}),
 * so it reaches at most one line further.
 */
const BOUND_MARGIN_DEGREES = 0.5

/**
 * How far, in projected units, a point that the bound read back can land from
 * the point that it was read from. A point off the globe reads back to a far
 * place or to none. A point on it reads back within a rounding error.
 */
const ROUND_TRIP_TOLERANCE = 0.5

/** The projection, with its output carried through `frame`. */
function framed(projection: GeoProjection, { x, y, k }: MapTransform): GeoStreamWrapper {
	const carry = geoTransform({
		point(px, py) {
			this.stream.point(px * k + x, py * k + y)
		},
	})

	return { stream: (sink) => projection.stream(carry.stream(sink)) }
}

/** A drawn `d`, or `null` where the projection drew none of the shape. */
function drawn(d: string | null): string | null {
	return d || null
}

/**
 * The part of the globe that the view shows, in degrees, out to the first line
 * of `step` past each edge. `null` where the bound cannot be read, and the
 * graticule then spans the globe as before.
 *
 * The view is the viewBox, cut to the bounds of the frame, because the
 * graticule draws only inside the frame. Each point on its edges reads back
 * onto the globe through `inverse`. Latitude has no extreme inside a region
 * that holds no pole. Longitude has none inside a region that also crosses no
 * antimeridian. Thus the edges hold the extent.
 *
 * A pole inside the view takes its latitude to that pole and its longitude
 * round the globe. A view that crosses the antimeridian takes its longitude
 * round the globe too ({@link crossesAntimeridian}).
 *
 * The bound gives up, and returns `null`, on each case it cannot read:
 *
 * - a projection with no inverse
 * - a point off the globe, such as the space round the globe on a world map
 * - a view or a frame with no area
 */
function graticuleBound(
	path: GeoPath,
	inverse: GeoProjection,
	view: MapViewFrame,
	frame: MapTransform | null,
	step: number,
): GeoExtent | null {
	const box = viewBox(path, view, frame ?? MAP_FIT_TRANSFORM)

	if (box === null) return null

	const walk = edgeWalk(inverse, box)

	if (walk === null) return null

	const [[west, south], [east, north]] = findExtent(walk)

	const northPole = holds(box, projectPoint(inverse, [0, 90]))

	const southPole = holds(box, projectPoint(inverse, [0, -90]))

	const round = northPole || southPole || crossesAntimeridian(walk)

	return [
		[
			lineBelow((round ? -180 : west) - BOUND_MARGIN_DEGREES, step),
			lineBelow((southPole ? -90 : south) - BOUND_MARGIN_DEGREES, step),
		],
		[
			lineAbove((round ? 180 : east) + BOUND_MARGIN_DEGREES, step),
			lineAbove((northPole ? 90 : north) + BOUND_MARGIN_DEGREES, step),
		],
	]
}

/** A box in the units the projection draws in: `[x0, y0, x1, y1]`. */
type ProjectedBox = readonly [x0: number, y0: number, x1: number, y1: number]

/**
 * The viewBox cut to the bounds of the frame, because the graticule draws only
 * inside the frame. `frame` carries it back into the units the projection
 * draws in. `null` where the cut has no area.
 */
function viewBox(path: GeoPath, view: MapViewFrame, frame: MapTransform): ProjectedBox | null {
	const [[frameX0, frameY0], [frameX1, frameY1]] = path.bounds(SPHERE)

	const from = invertTransform({ x: Math.max(0, frameX0), y: Math.max(0, frameY0) }, frame)

	const to = invertTransform(
		{ x: Math.min(view.width, frameX1), y: Math.min(view.height, frameY1) },
		frame,
	)

	return to.x > from.x && to.y > from.y ? [from.x, from.y, to.x, to.y] : null
}

/**
 * The positions that the edge of `box` reads back onto the globe, in one walk
 * round it. Each point follows its neighbor, and the last point leads back to
 * the first. `null` where a point is off the globe.
 */
function edgeWalk(inverse: GeoProjection, [x0, y0, x1, y1]: ProjectedBox): LngLat[] | null {
	const walk: LngLat[] = []

	const edges = [
		[x0, y0, x1, y0],
		[x1, y0, x1, y1],
		[x1, y1, x0, y1],
		[x0, y1, x0, y0],
	] as const

	for (const [ax, ay, bx, by] of edges) {
		for (let i = 0; i < BOUND_SAMPLES; i++) {
			const t = i / BOUND_SAMPLES

			const position = readBack(inverse, { x: ax + (bx - ax) * t, y: ay + (by - ay) * t })

			if (position === null) return null

			walk.push(position)
		}
	}

	return walk
}

/**
 * The position on the globe that the projected point `at` shows. `null` where
 * the projection has no inverse, or where the point is off the globe. A point
 * off the globe reads back to a far place or to none.
 */
function readBack(inverse: GeoProjection, at: MapPoint2D): LngLat | null {
	const position = unprojectPoint(inverse, at)

	const back = position === null ? null : projectPoint(inverse, position)

	return back !== null && Math.hypot(back.x - at.x, back.y - at.y) <= ROUND_TRIP_TOLERANCE
		? position
		: null
}

/** The box in degrees that holds each position of `walk`. */
function findExtent(walk: LngLat[]): GeoExtent {
	const lngs = walk.map(([lng]) => lng)

	const lats = walk.map(([, lat]) => lat)

	return [
		[Math.min(...lngs), Math.min(...lats)],
		[Math.max(...lngs), Math.max(...lats)],
	]
}

/**
 * Whether `walk` crosses the antimeridian. Two neighbors read more than half
 * the globe apart only there, where longitude jumps from one end of its range
 * to the other. So the walk finds the crossing with no point near 180°.
 */
function crossesAntimeridian(walk: LngLat[]): boolean {
	return walk.some(([lng], i) => {
		const [next] = walk[(i + 1) % walk.length] ?? [lng]

		return Math.abs(next - lng) > 180
	})
}

/** Whether `box` holds the projected point `at`. */
function holds([x0, y0, x1, y1]: ProjectedBox, at: MapPoint2D | null): boolean {
	return at !== null && at.x >= x0 && at.x <= x1 && at.y >= y0 && at.y <= y1
}

/**
 * The first line of `step` strictly below `degrees`. Strictly, because d3-geo
 * draws no line on the end of an extent, and the line on the edge must still
 * reach past the view.
 */
function lineBelow(degrees: number, step: number): number {
	return (Math.ceil(degrees / step) - 1) * step
}

/** The first line of `step` strictly above `degrees`. See {@link lineBelow}. */
function lineAbove(degrees: number, step: number): number {
	return (Math.floor(degrees / step) + 1) * step
}

/**
 * `extent` cut to `limit`, or `null` where the two do not meet. d3-geo swaps
 * the corners of an inverted extent and draws lines there. So an empty cut must
 * never reach it.
 */
function within(extent: GeoExtent, limit: GeoExtent): GeoExtent | null {
	const west = Math.max(extent[0][0], limit[0][0])

	const south = Math.max(extent[0][1], limit[0][1])

	const east = Math.min(extent[1][0], limit[1][0])

	const north = Math.min(extent[1][1], limit[1][1])

	return east > west && north > south
		? [
				[west, south],
				[east, north],
			]
		: null
}

/**
 * The meridians and parallels at `step` degrees, cut to `bound`. d3-geo draws
 * two sets of lines. The major lines run to the poles, and the minor lines
 * stop at 80°. The bound cuts each set inside its own default
 * extent, so a line the view shows ends where it ended before. Where the bound
 * misses either set, the graticule spans the globe.
 */
function boundedGraticule(step: number, bound: GeoExtent | null): GeoGeometryObjects {
	const graticule = geoGraticule().step([step, step])

	const major = bound === null ? null : within(bound, graticule.extentMajor())

	const minor = bound === null ? null : within(bound, graticule.extentMinor())

	if (major === null || minor === null) return graticule()

	return graticule.extentMajor(major).extentMinor(minor)()
}

/**
 * The chrome under one fit: the meridians and parallels at `step` degrees
 * (`null` where the graticule is off), and the frame the projection draws.
 *
 * The graticule serializes as one multi-line path rather than one per line, so a
 * world map's fifty-odd hairlines cost one element and one ink. Its lines span
 * the part of the globe that `view` shows, out to the first line past each
 * edge ({@link graticuleBound}). Each line ends past the edge of the view, so the
 * view shows each line that it showed before. A one-state map therefore
 * streams the few lines that cross it, not the globe's. A zoom never shows what
 * the bound cuts, because the zoom holds the view inside the fitted frame
 * (`map-zoom/transform`).
 *
 * The frame is the globe's edge where the projection has one, and a composite's
 * three clip boxes where it has none. Under `albers-usa` those are the
 * lower-48 box and the two inset boxes, in that order. It serves twice.
 * Stroked, it is the sphere outline a whole-world map closes its frame with.
 * Unstroked, it bounds the graticule.
 *
 * The composite streams the lines through all three of its sub-projections, so
 * each inset fills with fragments at its own angle. A clip to this path under
 * the even-odd rule leaves the main map ruled and every inset clear. There the
 * inset boxes read as holes in the outer one. One path, so the bound and the
 * outline can never disagree about where the projection draws. The insets keep
 * no line, so the bound reads the view through the lower-48 piece alone
 * (`inverse`, from `invertingPiece`).
 *
 * Both parts ride one `geoPath`, whose one decimal is the region paths'. Chrome
 * draws in the same frame units, where a second decimal serializes detail no
 * display resolves.
 *
 * `view` is the viewBox, in frame units. `frame` is the transform of a measured
 * fit that keeps the canonical projection (`measuredMapFit`). The path then
 * streams the projected points through it.
 *
 * @internal
 */
export function chromePaths(
	projection: GeoProjection,
	inverse: GeoProjection,
	step: number | null,
	view: MapViewFrame,
	frame: MapTransform | null = null,
): MapChromePaths {
	const path = geoPath(frame === null ? projection : framed(projection, frame)).digits(
		REGION_PATH_DIGITS,
	)

	return {
		graticule:
			step === null
				? null
				: drawn(path(boundedGraticule(step, graticuleBound(path, inverse, view, frame, step)))),
		frame: drawn(path(SPHERE)),
	}
}

/**
 * The graticule's degree step from the prop: `null` where it is off, and
 * otherwise a step floored at {@link GRATICULE_MIN_STEP_DEGREES}. A world
 * map's view spans the globe, so a step below a degree asks for millions of
 * points there.
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
