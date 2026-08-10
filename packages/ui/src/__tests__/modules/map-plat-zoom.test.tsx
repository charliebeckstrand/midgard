import { describe, expect, it, vi } from 'vitest'
import { type MapFeatureCollection, MapPlat } from '../../modules/map'
import { REGION_STROKE_WIDTH } from '../../modules/map/engine/map-constants'
import { act, bySlot, fireEvent, renderUI, withFakeTime } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * The zoom is a transform over the fitted geography, so these assert what the
 * layer draws rather than what the projection produced: the region paths never
 * change under a gesture, and the `<g>`'s own transform is the whole of the
 * view state. The pure arithmetic behind it is `map-zoom.test.ts`.
 */

type Row = (typeof FIXTURE_ROWS)[number]

function plat(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const props = {
		'aria-label': 'Zones',
		geography: FIXTURE_GEOJSON,
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		width: 400,
		zoom: true,
		...extra,
	} as Parameters<typeof MapPlat<Row>>[0]

	return <MapPlat {...props} />
}

/**
 * Renders the plat with a real SVG box and a plot region that answers pointer
 * capture. jsdom reports every rect as zero and implements none of the capture
 * API, and the gestures convert through both — without them a wheel would find
 * no focus and a drag would throw on its first press.
 */
function renderZoomable(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const view = renderUI(plat(extra))

	const svg = view.container.querySelector('svg')

	if (svg === null) throw new Error('the plat drew no SVG to zoom')

	vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 400,
		height: 200,
		right: 400,
		bottom: 200,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	})

	const plot = bySlot(view.container, 'map-plot')

	if (plot === null) throw new Error('the plat drew no plot region')

	plot.setPointerCapture = vi.fn()

	plot.releasePointerCapture = vi.fn()

	plot.hasPointerCapture = vi.fn(() => true)

	return { ...view, plot, svg }
}

/** The zoom layer's transform, or `null` where the plat drew no layer. */
function transformOf(container: HTMLElement): string | null {
	return bySlot(container, 'map-zoom')?.getAttribute('transform') ?? null
}

/** The scale the layer currently draws at, read off its own attribute. */
function scaleOf(container: HTMLElement): number {
	const match = /scale\((-?[\d.]+)\)/.exec(transformOf(container) ?? '')

	return match?.[1] === undefined ? Number.NaN : Number(match[1])
}

/** Sends a native wheel event, which is how the non-passive listener receives one. */
function wheel(
	svg: SVGSVGElement,
	deltaY: number,
	init: { clientX?: number; clientY?: number; deltaX?: number; shiftKey?: boolean } = {},
): WheelEvent {
	const event = new WheelEvent('wheel', {
		bubbles: true,
		cancelable: true,
		deltaY,
		clientX: 200,
		clientY: 100,
		...init,
	})

	act(() => {
		svg.dispatchEvent(event)
	})

	return event
}

/**
 * A wheel with the key held — the gesture a default map answers. Most of these
 * only need the map zoomed to assert something else, so they take the armed
 * form and leave the bare {@link wheel} to the tests about who owns a gesture.
 */
function zoomWheel(svg: SVGSVGElement, deltaY: number): WheelEvent {
	return wheel(svg, deltaY, { shiftKey: true })
}

/** A map whose wheel is armed outright — the opt-out, and rare on purpose. */
const DIRECT = { zoom: { modifier: false } } as const

/** Whether the layer currently answers the pointer, which a gesture in flight suspends. */
function answersPointer(container: HTMLElement): boolean {
	return bySlot(container, 'map-zoom')?.getAttribute('pointer-events') !== 'none'
}

/** Presses two touch pointers, moves them to new places, and releases both. */
function twoFinger(
	plot: HTMLElement,
	from: [{ x: number; y: number }, { x: number; y: number }],
	to: [{ x: number; y: number }, { x: number; y: number }],
) {
	for (const [index, at] of from.entries()) {
		fireEvent.pointerDown(plot, {
			pointerId: index + 1,
			pointerType: 'touch',
			clientX: at.x,
			clientY: at.y,
		})
	}

	for (const [index, at] of to.entries()) {
		fireEvent.pointerMove(plot, { pointerId: index + 1, clientX: at.x, clientY: at.y })
	}

	for (const index of [0, 1]) fireEvent.pointerUp(plot, { pointerId: index + 1 })
}

/** Presses, drags, and releases one pointer across the plot region. */
function drag(plot: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }) {
	fireEvent.pointerDown(plot, {
		pointerId: 1,
		button: 0,
		pointerType: 'mouse',
		clientX: from.x,
		clientY: from.y,
	})

	fireEvent.pointerMove(plot, { pointerId: 1, clientX: to.x, clientY: to.y })

	fireEvent.pointerUp(plot, { pointerId: 1 })
}

describe('MapPlat zoom layer', () => {
	it('draws no layer without the prop, so a static map keeps the tree it had', () => {
		const { container } = renderZoomable({ zoom: undefined })

		expect(bySlot(container, 'map-zoom')).toBeNull()
	})

	it('draws one at the fit when the prop is on', () => {
		const { container } = renderZoomable()

		expect(transformOf(container)).toBe('translate(0 0) scale(1)')
	})

	it('leaves the page its touch scrolling by default, and takes only its pinch', () => {
		// The bargain the key buys on the wheel, kept on touch: one finger scrolls
		// the page, two pan and pinch — so the browser keeps `pan-x pan-y` and
		// loses only the pinch that would page-zoom over the map.
		const { plot } = renderZoomable()

		expect(plot).not.toHaveClass('touch-none')

		expect(plot).toHaveClass('[touch-action:pan-x_pan-y]')
	})

	it('claims touch outright only where the wheel is armed outright', () => {
		expect(renderZoomable(DIRECT).plot).toHaveClass('touch-none')

		expect(renderZoomable({ zoom: undefined }).plot).not.toHaveClass('touch-none')
	})

	it('reads a ceiling at the fit as no zoom at all', () => {
		const { container, plot } = renderZoomable({ zoom: 1 })

		expect(bySlot(container, 'map-zoom')).toBeNull()

		expect(plot).not.toHaveClass('touch-none')
	})
})

describe('MapPlat gesture suspends the readout', () => {
	it('stops the drawing answering the pointer while a wheel zoom runs, and gives it back once it settles', async () => {
		await withFakeTime(async (clock) => {
			const { container, svg } = renderZoomable()

			expect(answersPointer(container)).toBe(true)

			zoomWheel(svg, -200)

			// A scaling frame sweeps the geography under a stationary pointer, so
			// every dot it crosses would raise its own readout. The layer goes inert
			// for the gesture instead.
			expect(answersPointer(container)).toBe(false)

			await clock.advance(60)

			// A wheel reports no end, so the gesture is still live inside the window.
			expect(answersPointer(container)).toBe(false)

			zoomWheel(svg, -200)

			await clock.advance(60)

			// The second notch re-armed it, so the two read as one gesture.
			expect(answersPointer(container)).toBe(false)

			await clock.advance(200)

			expect(answersPointer(container)).toBe(true)
		})
	})

	it('stops it while a pan runs, and gives it back on release', () => {
		const { container, plot } = renderZoomable()

		// Zoomed from the keyboard rather than the wheel, so no settle window is
		// open and the release is the only thing that can end the gesture.
		fireEvent.keyDown(plot, { key: '+' })

		fireEvent.pointerDown(plot, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })

		fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })

		expect(answersPointer(container)).toBe(false)

		fireEvent.pointerUp(plot, { pointerId: 1 })

		expect(answersPointer(container)).toBe(true)
	})

	it('holds the drawing inert while a wheel settles under a live pan', async () => {
		await withFakeTime(async (clock) => {
			const { container, plot, svg } = renderZoomable()

			zoomWheel(svg, -400)

			fireEvent.pointerDown(plot, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })

			fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })

			// The wheel's window closes while the pointer is still down; the pan is
			// the live gesture now, so neither release lets go on its own.
			await clock.advance(400)

			expect(answersPointer(container)).toBe(false)

			fireEvent.pointerUp(plot, { pointerId: 1 })

			expect(answersPointer(container)).toBe(true)
		})
	})
})

describe('MapPlat wheel, armed by the shift key', () => {
	it('hands a plain wheel back to the page untouched', () => {
		// The default, and the reason it is the default: a map dropped into a page
		// cannot swallow a scroll the reader meant for the page.
		const { container, svg } = renderZoomable()

		const event = wheel(svg, -200)

		expect(scaleOf(container)).toBe(1)

		expect(event.defaultPrevented).toBe(false)
	})

	it('zooms while the key is held, and takes the gesture with it', () => {
		const { container, svg } = renderZoomable()

		const event = zoomWheel(svg, -200)

		expect(scaleOf(container)).toBeGreaterThan(1)

		expect(event.defaultPrevented).toBe(true)
	})

	it('traps the scroll while the key is held, even where the view cannot move', () => {
		const { container, svg } = renderZoomable()

		// At the fit there is nothing to zoom out to, but the reader aimed the
		// gesture at the map by holding the key — so it never reaches the page,
		// where a shift-wheel would scroll it sideways.
		const event = zoomWheel(svg, 200)

		expect(scaleOf(container)).toBe(1)

		expect(event.defaultPrevented).toBe(true)
	})

	it('still steps the scale from the keyboard, which needs no modifier', () => {
		const { container, plot } = renderZoomable()

		fireEvent.keyDown(plot, { key: '+' })

		expect(scaleOf(container)).toBeGreaterThan(1)
	})
})

describe('MapPlat wheel after the shift key is let go', () => {
	it("swallows the trackpad's momentum, so the page never scrolls a little on release", () => {
		const { container, svg } = renderZoomable()

		zoomWheel(svg, -40)

		const zoomed = scaleOf(container)

		// The fingers have left and the key with them, but the trackpad is still
		// sending: each event pushes less than the one before it.
		for (const delta of [-30, -18, -9, -3]) {
			expect(wheel(svg, delta).defaultPrevented).toBe(true)
		}

		// Taken from the page and given to nothing: the release is what stops the
		// zoom, so the tail leaves the view exactly where the key left it.
		expect(scaleOf(container)).toBe(zoomed)
	})

	it('keeps holding it once it has run down to a plateau, where the decay ends', () => {
		const { svg } = renderZoomable()

		zoomWheel(svg, -40)

		// The stream shows it is running down, and then rounds to a figure it
		// repeats — the last pixels of a decay, and still not the page's.
		for (const delta of [-12, -2, -2, -2]) {
			expect(wheel(svg, delta).defaultPrevented).toBe(true)
		}
	})

	it('never holds a wheel that has not run down, since a mouse notch is a fixed delta', () => {
		const { svg } = renderZoomable()

		zoomWheel(svg, -100)

		// A mouse has no momentum to coast on: every notch reports the same delta,
		// so a reader who let the key go and kept scrolling is still scrolling the
		// page, and must never find it held under them.
		for (const _ of [1, 2, 3]) {
			expect(wheel(svg, -100).defaultPrevented).toBe(false)
		}
	})

	it('hands the stream back where the push grows, since that is a hand back on the trackpad', () => {
		const { container, svg } = renderZoomable()

		zoomWheel(svg, -40)

		expect(wheel(svg, -30).defaultPrevented).toBe(true)

		// A reader who pushes harder through the tail is scrolling the page, not
		// coasting out of a zoom — so the map lets go, and stays let go.
		expect(wheel(svg, -90).defaultPrevented).toBe(false)

		expect(wheel(svg, -20).defaultPrevented).toBe(false)

		expect(scaleOf(container)).toBeGreaterThan(1)
	})

	it('holds the stream across the axis the key was moving it onto', () => {
		const { container, svg } = renderZoomable()

		// The browser reports the held gesture on `deltaX`, and the tail after the
		// release on `deltaY` — one stream, measured the same on either axis.
		wheel(svg, 0, { deltaX: -40, shiftKey: true })

		expect(scaleOf(container)).toBeGreaterThan(1)

		expect(wheel(svg, -30).defaultPrevented).toBe(true)
	})

	it('lets the page have a wheel that arrives after the stream settles', async () => {
		await withFakeTime(async (clock) => {
			const { svg } = renderZoomable()

			zoomWheel(svg, -40)

			await clock.advance(400)

			// Past the settle gap there is no stream left to continue, so this is a
			// plain wheel and the map never sees a claim on it.
			expect(wheel(svg, -30).defaultPrevented).toBe(false)
		})
	})
})

describe('MapPlat wheel, armed outright', () => {
	it('zooms on a plain wheel', () => {
		const { container, svg } = renderZoomable(DIRECT)

		const event = wheel(svg, -200)

		expect(scaleOf(container)).toBeGreaterThan(1)

		expect(event.defaultPrevented).toBe(true)
	})

	it('leaves the page its scroll where the gesture moves nothing', () => {
		const { container, svg } = renderZoomable(DIRECT)

		// Zooming out at the fit is a no-op, so a reader who has zoomed out is
		// never held on the map: the wheel falls through and the page scrolls.
		const event = wheel(svg, 200)

		expect(scaleOf(container)).toBe(1)

		expect(event.defaultPrevented).toBe(false)
	})
})

describe('MapPlat two-finger gestures', () => {
	it("pans by the pair's travel, so a two-finger drag moves the map", () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		// The spread holds and the pair travels, so this is a pan and not a pinch.
		twoFinger(
			plot,
			[
				{ x: 180, y: 100 },
				{ x: 220, y: 100 },
			],
			[
				{ x: 140, y: 70 },
				{ x: 180, y: 70 },
			],
		)

		expect(transformOf(container)).not.toBe(before)

		expect(scaleOf(container)).toBeCloseTo(scaleOf(container), 6)
	})

	it("scales by the pair's spread", () => {
		const { container, plot } = renderZoomable()

		twoFinger(
			plot,
			[
				{ x: 190, y: 100 },
				{ x: 210, y: 100 },
			],
			[
				{ x: 140, y: 100 },
				{ x: 260, y: 100 },
			],
		)

		expect(scaleOf(container)).toBeGreaterThan(1)
	})

	it('pans a lone finger on a map that claims touch outright', () => {
		const { container, plot } = renderZoomable(DIRECT)

		fireEvent.keyDown(plot, { key: '+' })

		const before = transformOf(container)

		fireEvent.pointerDown(plot, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 100 })

		fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })

		fireEvent.pointerUp(plot, { pointerId: 1 })

		expect(transformOf(container)).not.toBe(before)
	})

	it('leaves a lone finger to the page by default', () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		fireEvent.pointerDown(plot, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 100 })

		fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })

		fireEvent.pointerUp(plot, { pointerId: 1 })

		expect(transformOf(container)).toBe(before)
	})

	it('still pans a lone mouse, which has no scroll to give up', () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		drag(plot, { x: 200, y: 100 }, { x: 140, y: 60 })

		expect(transformOf(container)).not.toBe(before)
	})
})

describe('MapPlat wheel zoom', () => {
	it('stops at the ceiling the prop names', () => {
		const { container, svg } = renderZoomable({ zoom: 2 })

		zoomWheel(svg, -2000)

		expect(scaleOf(container)).toBe(2)
	})

	it('scales the geography without reprojecting a single path', () => {
		const { container, svg } = renderZoomable()

		const before = [...container.querySelectorAll('[data-region-index]')].map((path) =>
			path.getAttribute('d'),
		)

		zoomWheel(svg, -200)

		const after = [...container.querySelectorAll('[data-region-index]')].map((path) =>
			path.getAttribute('d'),
		)

		expect(after).toEqual(before)
	})

	it('holds the region seam at a hairline through the transform', () => {
		const { container, svg } = renderZoomable()

		zoomWheel(svg, -200)

		const k = scaleOf(container)

		expect(k).toBeGreaterThan(1)

		// The seam is inherited from the very group that carries the transform, so
		// what the browser draws is this width scaled by the k under it. Dividing it
		// out is the whole rule: one device pixel, at every scale the view takes.
		// To three places, because that is where `transformAttribute` rounds the
		// scale the width is read back against — a hairline out by a ten-thousandth.
		const layer = bySlot(container, 'map-zoom')

		expect(Number(layer?.getAttribute('stroke-width')) * k).toBeCloseTo(REGION_STROKE_WIDTH, 3)
	})

	it('moves the whole atlas on that one attribute, never per region', () => {
		const { container, svg } = renderZoomable()

		const before = container.querySelector('[data-region-index]')?.getAttribute('d')

		zoomWheel(svg, -200)

		const region = container.querySelector('[data-region-index]')

		// A region path states no width and takes no vector effect, so a notch
		// rewrites one attribute on the group rather than thousands beneath it —
		// and it reprojects nothing, which is what the transform is for.
		expect(region?.getAttribute('stroke-width')).toBeNull()

		expect(region?.getAttribute('vector-effect')).toBeNull()

		expect(region?.getAttribute('d')).toBe(before)
	})
})

describe('MapPlat pan', () => {
	it('moves the view on a drag once it passes the threshold', () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		drag(plot, { x: 200, y: 100 }, { x: 160, y: 80 })

		expect(transformOf(container)).not.toBe(before)
	})

	it('holds the view for a press that never travels', () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		drag(plot, { x: 200, y: 100 }, { x: 202, y: 101 })

		expect(transformOf(container)).toBe(before)
	})

	it('swallows the click a drag ends on, so a pan never reports a pick', () => {
		const onRegionClick = vi.fn()

		const { plot } = renderZoomable({ onRegionClick })

		drag(plot, { x: 200, y: 100 }, { x: 140, y: 60 })

		fireEvent.click(plot)

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('still picks on a press that never became a pan', () => {
		const onRegionClick = vi.fn()

		const { container, plot } = renderZoomable({ onRegionClick })

		const region = container.querySelector('[data-region-index]')

		if (region === null) throw new Error('the plat drew no region to pick')

		drag(plot, { x: 200, y: 100 }, { x: 201, y: 100 })

		fireEvent.click(region)

		expect(onRegionClick).toHaveBeenCalledWith('A', 0)
	})
})

describe('MapPlat keyboard zoom', () => {
	it('steps the scale in and out, and returns to the fit', () => {
		const { container, plot } = renderZoomable()

		fireEvent.keyDown(plot, { key: '+' })

		const stepped = scaleOf(container)

		expect(stepped).toBeGreaterThan(1)

		fireEvent.keyDown(plot, { key: '-' })

		expect(scaleOf(container)).toBeLessThan(stepped)

		fireEvent.keyDown(plot, { key: '+' })

		fireEvent.keyDown(plot, { key: '0' })

		expect(transformOf(container)).toBe('translate(0 0) scale(1)')
	})

	it('earns the plot a tab stop from the zoom alone', () => {
		// No readout and no pick: without the zoom this plat is a plain
		// `role="img"` leaf, and the scale would be out of a keyboard's reach.
		expect(renderZoomable({ tooltip: false }).plot).toHaveAttribute('tabindex', '0')

		expect(renderZoomable({ tooltip: false, zoom: undefined }).plot).not.toHaveAttribute('tabindex')
	})

	it('leaves the cursor its own keys', () => {
		const { container, plot } = renderZoomable()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(scaleOf(container)).toBe(1)

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Alpha')
	})
})

describe('MapPlat zoom across a geography change', () => {
	it('returns to the fit, because the new geography frames itself', () => {
		const { container, svg, rerender } = renderZoomable()

		zoomWheel(svg, -400)

		expect(scaleOf(container)).toBeGreaterThan(1)

		const one: MapFeatureCollection = {
			type: 'FeatureCollection',
			features: FIXTURE_GEOJSON.features.slice(0, 1),
		}

		rerender(plat({ geography: one }))

		expect(transformOf(container)).toBe('translate(0 0) scale(1)')
	})
})
