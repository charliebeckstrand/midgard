// @vitest-environment node
import {
	type GeoProjection,
	geoAlbersUsa,
	geoAzimuthalEqualArea,
	geoEqualEarth,
	geoGraticule,
	geoMercator,
	geoPath,
} from 'd3-geo'
import { describe, expect, it } from 'vitest'
import {
	GRATICULE_MIN_STEP_DEGREES,
	GRATICULE_STEP_DEGREES,
} from '../../modules/map/engine/map-constants'
import { cachedChromePaths } from '../../modules/map/engine/map-geometry/cache'
import {
	chromePaths,
	EMPTY_CHROME,
	graticuleStep,
} from '../../modules/map/engine/map-geometry/chrome'
import { invertingPiece } from '../../modules/map/engine/map-projection/resolve'
import type { MapViewFrame } from '../../modules/map/engine/map-zoom/transform'
import type { MapProjection } from '../../modules/map/engine/types'
import { subpathCount } from '../helpers/geometry/svg-path'
import { HALF_PIXEL } from '../helpers/geometry/tolerance'
import { fitProjection } from '../helpers/map-fit'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The projection and the path string round each coordinate, so an x of the
 * outline can miss the frame edge by this bound.
 */
const FRAME_EDGE_TOLERANCE = 0.05

/**
 * A mercator fit to the fixture squares: the fit the plat draws chrome under.
 * Held once: nothing here mutates a projection, and the cache keys on this
 * instance, so a fresh fit per call would test a different memo each time.
 */
const FITTED = fitProjection('mercator', FIXTURE_GEOJSON.features, 400, 200)

/** The box that {@link FITTED} fills. */
const FITTED_VIEW: MapViewFrame = { width: 400, height: 200 }

/**
 * How far a point of one graticule path can land from the line of the other.
 * Each path rounds its points to one decimal, so a point moves up to 0.05 on
 * each axis, and the line between two rounded points moves as far again.
 */
const PATH_ROUNDING = 0.15

/**
 * How close to a ring of the frame a point can come and still count as drawn.
 * A composite's inset lines end on the edges of their boxes, where the clip
 * cuts them to nothing. A point within this of an edge reads as cut.
 */
const CLIP_EDGE = 0.5

type Point = readonly [number, number]

/** The subpaths of an SVG path `d` as point lists. `Z` closes a ring onto its first point. */
function polylines(d: string | null): Point[][] {
	return (d ?? '')
		.split('M')
		.filter(Boolean)
		.map((part) => {
			const points = Array.from(part.matchAll(/(-?[\d.]+),(-?[\d.]+)/g), ([, x, y]) => [
				Number(x),
				Number(y),
			]) as Point[]

			const [first] = points

			return part.includes('Z') && first !== undefined ? [...points, first] : points
		})
}

/** The distance from `p` to the segment from `a` to `b`. */
function segmentDistance(p: Point, a: Point, b: Point): number {
	const dx = b[0] - a[0]

	const dy = b[1] - a[1]

	const length = dx * dx + dy * dy

	const t =
		length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length))

	return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** Each segment of `lines`, as its pair of end points. */
function segments(lines: Point[][]): [Point, Point][] {
	return lines.flatMap((line) => line.slice(1).map((b, i): [Point, Point] => [line[i] ?? b, b]))
}

/** The distance from `p` to the nearest segment of `lines`. */
function lineDistance(p: Point, lines: Point[][]): number {
	return Math.min(
		Number.POSITIVE_INFINITY,
		...segments(lines).map(([a, b]) => segmentDistance(p, a, b)),
	)
}

/** Whether the frame's rings hold `p` under the even-odd rule that clips the graticule. */
function insideFrame(p: Point, rings: Point[][]): boolean {
	return segments(rings).reduce(
		(inside, [a, b]) =>
			a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
				? !inside
				: inside,
		false,
	)
}

/**
 * The points of `graticule` that a reader sees: inside the view, inside the
 * frame's clip, and clear of the clip's edges.
 */
function shownPoints(graticule: string | null, frame: string | null, view: MapViewFrame): Point[] {
	const rings = polylines(frame)

	return polylines(graticule)
		.flat()
		.filter(
			(p) =>
				p[0] >= 0 &&
				p[1] >= 0 &&
				p[0] <= view.width &&
				p[1] <= view.height &&
				insideFrame(p, rings) &&
				lineDistance(p, rings) > CLIP_EDGE,
		)
}

/**
 * The widest gap, in frame units, between what the reader sees of `a` and the
 * lines of `b`. Zero where `b` draws each point of `a` that the view shows.
 */
function shownGap(a: string | null, b: string | null, frame: string | null, view: MapViewFrame) {
	const lines = polylines(b)

	return Math.max(0, ...shownPoints(a, frame, view).map((p) => lineDistance(p, lines)))
}

/** The graticule over the whole globe: the path the chrome drew before it read the view. */
function wholeGraticule(projection: GeoProjection, step: number): string | null {
	return geoPath(projection).digits(1)(geoGraticule().step([step, step])())
}

/** The trimmed graticule and the frame of `projection` in `view`, at `step`. */
function trimmed(
	spec: MapProjection,
	projection: GeoProjection,
	view: MapViewFrame,
	step = GRATICULE_STEP_DEGREES,
) {
	return chromePaths(projection, invertingPiece(spec, projection), step, view)
}

describe('graticuleStep', () => {
	it('reads the prop as off, the default step, or a given one', () => {
		expect(graticuleStep(false)).toBeNull()

		expect(graticuleStep(true)).toBe(GRATICULE_STEP_DEGREES)

		expect(graticuleStep(30)).toBe(30)
	})

	it('floors a step finer than one degree, and falls back on a non-finite one', () => {
		expect(graticuleStep(0.1)).toBe(GRATICULE_MIN_STEP_DEGREES)

		expect(graticuleStep(0)).toBe(GRATICULE_MIN_STEP_DEGREES)

		expect(graticuleStep(-10)).toBe(GRATICULE_MIN_STEP_DEGREES)

		expect(graticuleStep(Number.NaN)).toBe(GRATICULE_STEP_DEGREES)

		expect(graticuleStep(Number.POSITIVE_INFINITY)).toBe(GRATICULE_STEP_DEGREES)
	})
})

describe('chromePaths', () => {
	it('carries the paths through a frame transform', () => {
		// The measured fit of a passed instance keeps the canonical projection and
		// frames its output. The path streams the projected points through it.
		const plain = chromePaths(FITTED, FITTED, null, FITTED_VIEW).frame

		const framed = chromePaths(FITTED, FITTED, null, FITTED_VIEW, { x: 10, y: 20, k: 2 }).frame

		const [x = 0, y = 0] = (plain?.match(/-?[\d.]+/g) ?? []).map(Number)

		const [fx = 0, fy = 0] = (framed?.match(/-?[\d.]+/g) ?? []).map(Number)

		expect(fx).toBeNear(x * 2 + 10, HALF_PIXEL)

		expect(fy).toBeNear(y * 2 + 20, HALF_PIXEL)
	})

	it('draws the meridians and parallels as one multi-line path', () => {
		expect(
			subpathCount(chromePaths(FITTED, FITTED, GRATICULE_STEP_DEGREES, FITTED_VIEW).graticule),
		).toBeGreaterThan(1)
	})

	it('draws fewer lines as the step widens', () => {
		expect(subpathCount(chromePaths(FITTED, FITTED, 30, FITTED_VIEW).graticule)).toBeLessThan(
			subpathCount(chromePaths(FITTED, FITTED, 10, FITTED_VIEW).graticule),
		)
	})

	it('draws the frame with the graticule off, since it still bounds one', () => {
		const { graticule, frame } = chromePaths(FITTED, FITTED, null, FITTED_VIEW)

		expect(graticule).toBeNull()

		expect(frame).toMatch(/^M/)
	})

	it("outlines the globe's edge under a whole-world projection", () => {
		// A mercator fit to the sphere itself: the frame is the world's own edge, so
		// it closes the frame it was fitted to rather than running past it.
		const sphere = geoMercator().fitWidth(400, { type: 'Sphere' })

		const d = chromePaths(sphere, sphere, null, { width: 400, height: 400 }).frame ?? ''

		const xs = Array.from(d.matchAll(/(-?[\d.]+),-?[\d.]+/g), ([, x]) => Number(x))

		expect(Math.min(...xs)).toBeNear(0, FRAME_EDGE_TOLERANCE)

		expect(Math.max(...xs)).toBeNear(400, FRAME_EDGE_TOLERANCE)
	})

	it("outlines the composite projection's own clip frames", () => {
		// albers-usa has no single globe edge: it draws the lower-48 box and the
		// two inset boxes. The graticule's clip reads those two as holes in the
		// first, which is what keeps the insets clear of stray lines.
		const composite = geoAlbersUsa()

		expect(
			chromePaths(composite, composite, null, { width: 960, height: 500 }).frame?.match(/Z/g),
		).toHaveLength(3)
	})
})

describe('chromePaths: the graticule bound', () => {
	// d3-geo's own albers-usa fit: the lower 48 and the insets in a 960 × 500 box.
	const ALBERS_VIEW: MapViewFrame = { width: 960, height: 500 }

	it('draws each line of the lower 48 that the whole graticule draws', () => {
		const composite = geoAlbersUsa()

		const { graticule, frame } = trimmed('albers-usa', composite, ALBERS_VIEW)

		const whole = wholeGraticule(composite, GRATICULE_STEP_DEGREES)

		expect(shownPoints(whole, frame, ALBERS_VIEW).length).toBeGreaterThan(0)

		expect(shownGap(whole, graticule, frame, ALBERS_VIEW)).toBeLessThanOrEqual(PATH_ROUNDING)

		expect(shownGap(graticule, whole, frame, ALBERS_VIEW)).toBeLessThanOrEqual(PATH_ROUNDING)

		expect(subpathCount(graticule)).toBeLessThan(subpathCount(whole))
	})

	it('reads the albers-usa view through the lower-48 piece, not the insets', () => {
		// A point of the view in the Alaska box. The composite reads it as a point
		// of Alaska, far west of the lower 48, and a bound read that way spans the
		// globe's west.
		const composite = geoAlbersUsa()

		const inAlaska: [number, number] = [100, 450]

		const [lng = 0] = composite.invert?.(inAlaska) ?? []

		expect(lng).toBeLessThan(-140)

		const [pieceLng = 0] = invertingPiece('albers-usa', composite).invert?.(inAlaska) ?? []

		expect(pieceLng).toBeGreaterThan(-140)

		expect(pieceLng).toBeLessThan(-100)
	})

	it('trims a regional map to the few lines that cross it', () => {
		// One fixture square under mercator: the whole graticule draws the globe's
		// lines far outside the box, and the bound keeps the ones near it.
		const { graticule, frame } = trimmed('mercator', FITTED, FITTED_VIEW, 1)

		const whole = wholeGraticule(FITTED, 1)

		expect(shownGap(whole, graticule, frame, FITTED_VIEW)).toBeLessThanOrEqual(PATH_ROUNDING)

		expect(subpathCount(graticule)).toBeLessThan(subpathCount(whole) / 10)
	})

	it('spans the globe where the view shows space round it', () => {
		// The corners of a world map fall off the globe and read back nowhere, so
		// the bound gives up and the lines are the whole graticule.
		const world = geoEqualEarth().fitWidth(500, { type: 'Sphere' })

		const view = { width: 500, height: 250 }

		expect(trimmed('equal-earth', world, view).graticule).toBe(
			wholeGraticule(world, GRATICULE_STEP_DEGREES),
		)
	})

	it('runs the meridians to a pole the view holds', () => {
		// A polar map: no edge of the view reaches the pole, so the edges alone
		// would stop every meridian short of it.
		const polar = geoAzimuthalEqualArea()
			.rotate([0, -90])
			.fitSize([400, 400], {
				type: 'MultiPoint',
				coordinates: [
					[0, 60],
					[90, 60],
					[180, 60],
					[-90, 60],
				],
			})

		const view = { width: 400, height: 400 }

		const { graticule, frame } = trimmed(polar, polar, view)

		const whole = wholeGraticule(polar, GRATICULE_STEP_DEGREES)

		expect(shownGap(whole, graticule, frame, view)).toBeLessThanOrEqual(PATH_ROUNDING)

		expect(graticule).not.toBe(whole)
	})

	it('keeps the meridian on the antimeridian in a view that crosses it', () => {
		// A Pacific map: the view crosses 180°, so its longitude takes the whole
		// range and the lines on each side of 180° still draw.
		const pacific = geoMercator()
			.rotate([-175, 0])
			.fitSize([400, 200], {
				type: 'Polygon',
				coordinates: [
					[
						[120, -10],
						[120, 10],
						[-130, 10],
						[-130, -10],
						[120, -10],
					],
				],
			})

		const view = { width: 400, height: 200 }

		// A one-degree step: no point the bound reads need land within a degree of
		// 180°, so only the crossing itself can take the bound to it.
		const { graticule, frame } = trimmed(pacific, pacific, view, 1)

		const whole = wholeGraticule(pacific, 1)

		expect(shownPoints(whole, frame, view).length).toBeGreaterThan(0)

		expect(shownGap(whole, graticule, frame, view)).toBeLessThanOrEqual(PATH_ROUNDING)
	})
})

describe('cachedChromePaths', () => {
	it('holds the paths across a repeat read at one box', () => {
		const first = cachedChromePaths(FITTED, 'mercator', 10, true, FITTED_VIEW)

		const second = cachedChromePaths(FITTED, 'mercator', 10, true, FITTED_VIEW)

		expect(second).toBe(first)

		expect(second.graticule).not.toBeNull()

		expect(second.frame).not.toBeNull()
	})

	it('redraws on a changed step, frame, or view', () => {
		const held = cachedChromePaths(FITTED, 'mercator', 10, true, FITTED_VIEW)

		expect(cachedChromePaths(FITTED, 'mercator', 30, true, FITTED_VIEW)).not.toBe(held)

		expect(
			cachedChromePaths(FITTED, 'mercator', 10, true, FITTED_VIEW, { x: 20, y: 0, k: 1 }),
		).not.toBe(held)

		expect(cachedChromePaths(FITTED, 'mercator', 10, true, { width: 400, height: 300 })).not.toBe(
			held,
		)
	})

	it('redraws when a passed instance refits to new geography', () => {
		// A passed d3 instance keeps its identity across fits, and each fit
		// mutates it in place. The box stays the same, but the fit state does not.
		const passed = geoMercator()

		const { features } = FIXTURE_GEOJSON

		fitProjection(passed, features.slice(0, 1), 400, 200)

		const before = cachedChromePaths(passed, passed, 10, true, FITTED_VIEW)

		fitProjection(passed, features.slice(1), 400, 200)

		const after = cachedChromePaths(passed, passed, 10, true, FITTED_VIEW)

		expect(after).not.toBe(before)

		expect(after).toEqual(chromePaths(passed, passed, 10, FITTED_VIEW))
	})

	it('holds them across a sphere toggle, which moves no line', () => {
		// The outline is the view's business: flipping it must not evict the
		// graticule pass the memo exists to hold.
		const outlined = cachedChromePaths(FITTED, 'mercator', 10, true, FITTED_VIEW)

		expect(cachedChromePaths(FITTED, 'mercator', 10, false, FITTED_VIEW)).toBe(outlined)
	})

	it('draws nothing, and takes no slot, while the chrome is off', () => {
		expect(cachedChromePaths(FITTED, 'mercator', null, false, FITTED_VIEW)).toBe(EMPTY_CHROME)
	})
})
