import { geoAlbersUsa, geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../modules/map'
import {
	CHROME_STROKE_WIDTH,
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
import { allRegions, bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * A mercator fit to the fixture squares — the fit the plat draws chrome under.
 * Held once: nothing here mutates a projection, and the cache keys on this
 * instance, so a fresh fit per call would test a different memo each time.
 */
const FITTED = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 400, 200)

/** How many separate lines a path holds: one `M` opens each. */
function lines(d: string | null | undefined): number {
	return (d ?? '').split('M').length - 1
}

/** A data-less plat over the fixture squares; the chrome props are the whole variable. */
function plat(extra?: { graticule?: boolean | number; sphere?: boolean; zoom?: boolean }) {
	return <MapPlat aria-label="Atlas" geography={FIXTURE_GEOJSON} width={400} {...extra} />
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
	it('draws the meridians and parallels as one multi-line path', () => {
		expect(lines(chromePaths(FITTED, GRATICULE_STEP_DEGREES).graticule)).toBeGreaterThan(1)
	})

	it('draws fewer lines as the step widens', () => {
		expect(lines(chromePaths(FITTED, 30).graticule)).toBeLessThan(
			lines(chromePaths(FITTED, 10).graticule),
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

describe('MapPlat chrome', () => {
	it('draws no chrome by default', () => {
		const { container } = renderUI(plat())

		expect(bySlot(container, 'map-chrome')).toBeNull()

		expect(allRegions(container)).toHaveLength(3)
	})

	it('rules the graticule under the geography, off the pointer', () => {
		const { container } = renderUI(plat({ graticule: true }))

		const chrome = bySlot(container, 'map-chrome')

		const graticule = bySlot(container, 'map-graticule')

		expect(chrome).toHaveClass('pointer-events-none')

		expect(graticule?.getAttribute('d')).toMatch(/^M/)

		expect(graticule).toHaveAttribute('fill', 'none')

		// The hairline is stated in device pixels and converted to frame units by the
		// chrome itself — two paths, so it reads the scale rather than inheriting it
		// the way the atlas below it does.
		expect(graticule).toHaveAttribute('stroke-width', String(CHROME_STROKE_WIDTH))

		expect(graticule).not.toHaveAttribute('vector-effect')

		// Paint order is document order: the chrome group precedes the region layer,
		// so a region fill covers the hairlines that cross it.
		const regions = bySlot(container, 'map-regions')

		expect(chrome?.compareDocumentPosition(regions as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
	})

	it('honours a degree step', () => {
		const { container: fine } = renderUI(plat({ graticule: 10 }))

		const { container: coarse } = renderUI(plat({ graticule: 30 }))

		const step = (container: HTMLElement) =>
			lines(bySlot(container, 'map-graticule')?.getAttribute('d'))

		expect(step(coarse)).toBeLessThan(step(fine))
	})

	it('outlines the sphere on its own, in its own ink', () => {
		const { container } = renderUI(plat({ sphere: true }))

		expect(bySlot(container, 'map-graticule')).toBeNull()

		const sphere = bySlot(container, 'map-sphere')

		expect(sphere?.getAttribute('d')).toMatch(/^M/)

		// The graticule takes the chart gridline and the sphere the axis baseline, a
		// step firmer; they must never resolve to one ink.
		const { container: ruled } = renderUI(plat({ graticule: true }))

		expect(sphere?.getAttribute('class')).not.toBe(
			bySlot(ruled, 'map-graticule')?.getAttribute('class'),
		)
	})

	it('draws both parts together, off one frame path', () => {
		const { container } = renderUI(plat({ graticule: true, sphere: true }))

		expect(bySlot(container, 'map-graticule')).toBeInTheDocument()

		// One path resolves the bound and the outline, so the two can never
		// disagree about where the projection draws.
		expect(bySlot(container, 'map-sphere')?.getAttribute('d')).toBe(
			bySlot(container, 'map-chrome-clip')?.firstElementChild?.getAttribute('d'),
		)
	})

	it('rides the view transform, so a zoom carries the lines with the geography', () => {
		// A meridian is a position on the globe like every region: it draws in frame
		// units, so it must travel and scale under the zoom group rather than hang
		// over a map moving beneath it.
		const { container } = renderUI(plat({ graticule: true, sphere: true, zoom: true }))

		expect(bySlot(container, 'map-chrome')?.closest('[data-slot="map-zoom"]')).toBeInTheDocument()

		// Still above the marks, so a region fill covers the lines that cross it.
		const chrome = bySlot(container, 'map-chrome')

		expect(chrome?.compareDocumentPosition(bySlot(container, 'map-regions') as Node)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		)
	})

	it('bounds the graticule by the frame the projection draws', () => {
		const { container } = renderUI(plat({ graticule: true }))

		const clip = bySlot(container, 'map-chrome-clip')

		const id = clip?.getAttribute('id') ?? ''

		expect(id).not.toBe('')

		// The even-odd rule is what reads a composite's inset boxes as holes rather
		// than as frame, so the insets stay clear of the fragments each
		// sub-projection would otherwise fill them with.
		expect(clip?.querySelector('path')).toHaveAttribute('clip-rule', 'evenodd')

		expect(bySlot(container, 'map-graticule')).toHaveAttribute('clip-path', `url(#${id})`)
	})
})
