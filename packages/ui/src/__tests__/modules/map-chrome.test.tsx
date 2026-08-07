import { geoAlbersUsa, geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../modules/map'
import {
	GRATICULE_MIN_STEP_DEGREES,
	GRATICULE_STEP_DEGREES,
} from '../../modules/map/engine/map-constants'
import { cachedChromePaths, staticMapGeometry } from '../../modules/map/engine/map-geometry/cache'
import {
	EMPTY_CHROME,
	framePath,
	graticulePath,
	graticuleStep,
} from '../../modules/map/engine/map-geometry/chrome'
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
import { allRegions, bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** A mercator fit to the fixture squares — the fit the plat draws chrome under. */
function fitted() {
	return fitMapProjection('mercator', FIXTURE_GEOJSON.features, 400, 200)
}

/** How many separate lines a path holds: one `M` opens each. */
function lines(d: string): number {
	return d.split('M').length - 1
}

/** A data-less plat over the fixture squares; the chrome props are the whole variable. */
function plat(extra?: { graticule?: boolean | number; sphere?: boolean }) {
	return <MapPlat aria-label="Atlas" geography={FIXTURE_GEOJSON} width={400} {...extra} />
}

describe('graticuleStep', () => {
	it('reads the prop as off, the default step, or a given one', () => {
		expect(graticuleStep(undefined)).toBeNull()

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

describe('graticulePath', () => {
	it('draws the meridians and parallels as one multi-line path', () => {
		const d = graticulePath(fitted(), GRATICULE_STEP_DEGREES)

		expect(d).toMatch(/^M/)

		expect(lines(d ?? '')).toBeGreaterThan(1)
	})

	it('draws fewer lines as the step widens', () => {
		const fine = graticulePath(fitted(), 10)

		const coarse = graticulePath(fitted(), 30)

		expect(lines(coarse ?? '')).toBeLessThan(lines(fine ?? ''))
	})
})

describe('framePath', () => {
	it("outlines the globe's edge under a whole-world projection", () => {
		// A mercator fit to the sphere itself: the outline is the world's own edge,
		// so it closes the frame it was fitted to rather than running past it.
		const d = framePath(geoMercator().fitWidth(400, { type: 'Sphere' })) ?? ''

		expect(d).toMatch(/^M/)

		const xs = Array.from(d.matchAll(/(-?[\d.]+),-?[\d.]+/g), ([, x]) => Number(x))

		expect(Math.min(...xs)).toBeCloseTo(0, 1)

		expect(Math.max(...xs)).toBeCloseTo(400, 1)
	})

	it("outlines the composite projection's own clip frames", () => {
		// albers-usa has no single globe edge — it draws the lower-48 box and the
		// two inset boxes. The graticule's clip reads those two as holes in the
		// first, which is what keeps the insets clear of stray lines.
		const d = framePath(geoAlbersUsa())

		expect(d?.match(/Z/g)).toHaveLength(3)
	})
})

describe('cachedChromePaths', () => {
	const geometry = staticMapGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

	it('holds the paths across a repeat read at one box', () => {
		const first = cachedChromePaths(geometry, fitted(), 400, 200, 10, true)

		const second = cachedChromePaths(geometry, fitted(), 400, 200, 10, true)

		expect(second).toBe(first)

		expect(second.graticule).not.toBeNull()

		expect(second.frame).not.toBeNull()

		expect(second.outline).toBe(true)
	})

	it('redraws on a resize and on a changed request', () => {
		const held = cachedChromePaths(geometry, fitted(), 400, 200, 10, true)

		expect(cachedChromePaths(geometry, fitted(), 800, 400, 10, true)).not.toBe(held)

		expect(cachedChromePaths(geometry, fitted(), 400, 200, 30, true)).not.toBe(held)

		// The frame still resolves with the outline off: it bounds the graticule.
		const bound = cachedChromePaths(geometry, fitted(), 400, 200, 10, false)

		expect(bound.outline).toBe(false)

		expect(bound.frame).not.toBeNull()
	})

	it('draws nothing, and takes no slot, while the chrome is off', () => {
		expect(cachedChromePaths(geometry, fitted(), 400, 200, null, false)).toBe(EMPTY_CHROME)
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

		expect(graticule).toHaveAttribute('vector-effect', 'non-scaling-stroke')

		// Paint order is document order: the chrome group precedes the region layer,
		// so a region fill covers the hairlines that cross it.
		const regions = bySlot(container, 'map-regions')

		expect(chrome?.compareDocumentPosition(regions as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
	})

	it('honours a degree step', () => {
		const { container: fine } = renderUI(plat({ graticule: 10 }))

		const { container: coarse } = renderUI(plat({ graticule: 30 }))

		const step = (container: HTMLElement) =>
			lines(bySlot(container, 'map-graticule')?.getAttribute('d') ?? '')

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

		const clip = container.querySelector('clipPath path')

		expect(bySlot(container, 'map-graticule')).toBeInTheDocument()

		// One path resolves the bound and the outline, so the two can never
		// disagree about where the projection draws.
		expect(bySlot(container, 'map-sphere')?.getAttribute('d')).toBe(clip?.getAttribute('d'))
	})

	it('bounds the graticule by the frame the projection draws', () => {
		const { container } = renderUI(plat({ graticule: true }))

		const clip = container.querySelector('clipPath')

		const id = clip?.getAttribute('id') ?? ''

		expect(id).not.toBe('')

		// The even-odd rule is what reads a composite's inset boxes as holes rather
		// than as frame, so the insets stay clear of the fragments each
		// sub-projection would otherwise fill them with.
		expect(clip?.querySelector('path')).toHaveAttribute('clip-rule', 'evenodd')

		expect(bySlot(container, 'map-graticule')?.parentElement).toHaveAttribute(
			'clip-path',
			`url(#${id})`,
		)
	})
})
