// @vitest-environment node
import { geoAlbersUsa, geoMercator } from 'd3-geo'
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
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
import { subpathCount } from '../helpers/geometry/svg-path'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * A mercator fit to the fixture squares — the fit the plat draws chrome under.
 * Held once: nothing here mutates a projection, and the cache keys on this
 * instance, so a fresh fit per call would test a different memo each time.
 */
const FITTED = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 400, 200)

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
	it('draws the meridians and parallels as one multi-line path', () => {
		expect(subpathCount(chromePaths(FITTED, GRATICULE_STEP_DEGREES).graticule)).toBeGreaterThan(1)
	})

	it('draws fewer lines as the step widens', () => {
		expect(subpathCount(chromePaths(FITTED, 30).graticule)).toBeLessThan(
			subpathCount(chromePaths(FITTED, 10).graticule),
		)
	})

	it('draws the frame with the graticule off, since it still bounds one', () => {
		const { graticule, frame } = chromePaths(FITTED, null)

		expect(graticule).toBeNull()

		expect(frame).toMatch(/^M/)
	})

	it("outlines the globe's edge under a whole-world projection", () => {
		// A mercator fit to the sphere itself: the frame is the world's own edge, so
		// it closes the frame it was fitted to rather than running past it.
		const d = chromePaths(geoMercator().fitWidth(400, { type: 'Sphere' }), null).frame ?? ''

		const xs = Array.from(d.matchAll(/(-?[\d.]+),-?[\d.]+/g), ([, x]) => Number(x))

		expect(Math.min(...xs)).toBeCloseTo(0, 1)

		expect(Math.max(...xs)).toBeCloseTo(400, 1)
	})

	it("outlines the composite projection's own clip frames", () => {
		// albers-usa has no single globe edge — it draws the lower-48 box and the
		// two inset boxes. The graticule's clip reads those two as holes in the
		// first, which is what keeps the insets clear of stray lines.
		expect(chromePaths(geoAlbersUsa(), null).frame?.match(/Z/g)).toHaveLength(3)
	})
})

describe('cachedChromePaths', () => {
	it('holds the paths across a repeat read at one box', () => {
		const first = cachedChromePaths(FITTED, 400, 200, 10, true)

		const second = cachedChromePaths(FITTED, 400, 200, 10, true)

		expect(second).toBe(first)

		expect(second.graticule).not.toBeNull()

		expect(second.frame).not.toBeNull()
	})

	it('redraws on a resize and on a changed step', () => {
		const held = cachedChromePaths(FITTED, 400, 200, 10, true)

		expect(cachedChromePaths(FITTED, 800, 400, 10, true)).not.toBe(held)

		expect(cachedChromePaths(FITTED, 400, 200, 30, true)).not.toBe(held)
	})

	it('holds them across a sphere toggle, which moves no line', () => {
		// The outline is the view's business: flipping it must not evict the
		// graticule pass the memo exists to hold.
		const outlined = cachedChromePaths(FITTED, 400, 200, 10, true)

		expect(cachedChromePaths(FITTED, 400, 200, 10, false)).toBe(outlined)
	})

	it('draws nothing, and takes no slot, while the chrome is off', () => {
		expect(cachedChromePaths(FITTED, 400, 200, null, false)).toBe(EMPTY_CHROME)
	})
})
