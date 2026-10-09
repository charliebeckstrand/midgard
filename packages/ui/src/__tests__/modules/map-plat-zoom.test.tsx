import { describe, expect, it, vi } from 'vitest'
import type { MapFeatureCollection } from '../../modules/map'
import { REGION_STROKE_WIDTH } from '../../modules/map/engine/map-constants'
import { act, bySlot, fireEvent, firstRegion, layerScale, present, withFakeTime } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * The zoom is a transform over the fitted geography, so these assert what the
 * layer draws rather than what the projection produced: the region paths never
 * change under a gesture, and the `<g>`'s own transform is the whole of the
 * view state. The pure arithmetic behind it is `map-zoom.test.ts`.
 */

/**
 * Renders the plat with a real SVG box. jsdom reports every rect as zero, and
 * the gestures convert through the box, so without it a wheel would find no
 * focus. The pointer capture a drag takes is the setup's stub, which answers
 * what the plot really took and released.
 */
function renderZoomable(extra?: Parameters<typeof categoricalPlat>[0]) {
	return renderNavigable(categoricalPlat({ zoom: true, ...extra }))
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

/** A contact on the plot's SVG, as a touch event reports it. */
type Contact = { id: number; x: number; y: number }

/**
 * Sends one touch event to the SVG with the contacts that are down after it, and
 * returns whether a listener let it through. A modifier map reads its fingers off
 * these, since the browser can cancel the pointer events for a pinch.
 */
function touch(
	svg: SVGSVGElement,
	type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
	contacts: Contact[],
): boolean {
	const touches = contacts.map(({ id, x, y }) => ({
		identifier: id,
		clientX: x,
		clientY: y,
		target: svg,
	}))

	// Every contact is reported as changed. The map reads the ones a start
	// brings, and a start that repeats a finger already down changes nothing.
	return fireEvent[type](svg, { touches, changedTouches: touches })
}

/** Lands two fingers on the SVG, moves them to new places, and lifts both. */
function twoFinger(
	svg: SVGSVGElement,
	from: [{ x: number; y: number }, { x: number; y: number }],
	to: [{ x: number; y: number }, { x: number; y: number }],
) {
	const down = from.map((at, index) => ({ id: index + 1, ...at }))

	touch(svg, 'touchStart', down.slice(0, 1))

	touch(svg, 'touchStart', down)

	act(() => {
		touch(
			svg,
			'touchMove',
			to.map((at, index) => ({ id: index + 1, ...at })),
		)
	})

	// The lift applies the travel that waits for its frame.
	touch(svg, 'touchEnd', [])
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

		expect(plot).toHaveClass('touch-pan-x', 'touch-pan-y')
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
		const { container, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		const scale = scaleOf(container)

		// The spread holds and the pair travels, so this is a pan and not a pinch.
		twoFinger(
			svg,
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

		expect(scaleOf(container)).toBeCloseTo(scale, 6)
	})

	it("scales by the pair's spread", () => {
		const { container, svg } = renderZoomable()

		twoFinger(
			svg,
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

	it('keeps a two-finger move from the page by default, so the browser cannot pan it', () => {
		const { svg } = renderZoomable()

		const pair = [
			{ id: 1, x: 190, y: 100 },
			{ id: 2, x: 210, y: 100 },
		]

		// One finger is the page's scroll, so it passes through. `fireEvent`
		// returns `false` when a listener canceled the event.
		expect(touch(svg, 'touchStart', pair.slice(0, 1))).toBe(true)

		expect(touch(svg, 'touchMove', pair.slice(0, 1))).toBe(true)

		expect(touch(svg, 'touchStart', pair)).toBe(false)

		expect(touch(svg, 'touchMove', pair)).toBe(false)

		// The finger left down after a pinch stays the map's until it lifts, so it
		// cannot scroll the page out from under the map.
		expect(touch(svg, 'touchEnd', pair.slice(0, 1))).toBe(false)

		expect(touch(svg, 'touchMove', pair.slice(0, 1))).toBe(false)

		touch(svg, 'touchEnd', [])

		expect(touch(svg, 'touchStart', pair.slice(0, 1))).toBe(true)
	})

	it('pinches after the browser takes the first finger for a page scroll', () => {
		// The first finger lands a moment early and starts the page's scroll. The
		// browser cancels its pointer and sends no pointer event for the second
		// finger. Only the touch events carry the pinch.
		const { container, plot, svg } = renderZoomable()

		fireEvent.pointerDown(plot, { pointerId: 1, pointerType: 'touch', clientX: 190, clientY: 100 })

		touch(svg, 'touchStart', [{ id: 1, x: 190, y: 100 }])

		touch(svg, 'touchMove', [{ id: 1, x: 185, y: 102 }])

		fireEvent.pointerCancel(plot, { pointerId: 1, pointerType: 'touch' })

		touch(svg, 'touchStart', [
			{ id: 1, x: 185, y: 102 },
			{ id: 2, x: 205, y: 102 },
		])

		touch(svg, 'touchMove', [
			{ id: 1, x: 165, y: 102 },
			{ id: 2, x: 225, y: 102 },
		])

		touch(svg, 'touchEnd', [])

		// The spread went from 20 to 60, so the scale is three times the fit.
		expect(scaleOf(container)).toBeCloseTo(3, 3)
	})

	it('leaves the touch pointers alone on a default map, so a pinch applies once', () => {
		const { container, plot } = renderZoomable()

		for (const [index, x] of [190, 210].entries()) {
			fireEvent.pointerDown(plot, {
				pointerId: index + 1,
				pointerType: 'touch',
				clientX: x,
				clientY: 100,
			})
		}

		fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 100 })

		for (const index of [0, 1]) fireEvent.pointerUp(plot, { pointerId: index + 1 })

		expect(scaleOf(container)).toBe(1)
	})

	it('leaves a two-finger move alone on a map that does not zoom', () => {
		const { plot, svg } = renderZoomable({ zoom: undefined })

		for (const [index, x] of [190, 210].entries()) {
			fireEvent.pointerDown(plot, {
				pointerId: index + 1,
				pointerType: 'touch',
				clientX: x,
				clientY: 100,
			})
		}

		expect(fireEvent.touchMove(svg)).toBe(true)
	})

	it('takes both fingers of one frame, so the scale keeps up with the spread', () => {
		// A phone reports each finger as its own move, and both can land before
		// React renders. The second move must build on the first. A map that
		// claims touch outright reads its fingers off the pointer events.
		const { container, plot } = renderZoomable(DIRECT)

		for (const [index, x] of [190, 210].entries()) {
			fireEvent.pointerDown(plot, {
				pointerId: index + 1,
				pointerType: 'touch',
				clientX: x,
				clientY: 100,
			})
		}

		act(() => {
			fireEvent.pointerMove(plot, { pointerId: 1, clientX: 170, clientY: 100 })

			fireEvent.pointerMove(plot, { pointerId: 2, clientX: 230, clientY: 100 })
		})

		for (const index of [0, 1]) fireEvent.pointerUp(plot, { pointerId: index + 1 })

		// The spread went from 20 to 60, so the scale is three times the fit.
		expect(scaleOf(container)).toBeCloseTo(3, 3)
	})

	it('applies the pinch on the next frame, while both fingers stay down', async () => {
		await withFakeTime(async (clock) => {
			const { container, svg } = renderZoomable()

			touch(svg, 'touchStart', [
				{ id: 1, x: 190, y: 100 },
				{ id: 2, x: 210, y: 100 },
			])

			touch(svg, 'touchMove', [
				{ id: 1, x: 170, y: 100 },
				{ id: 2, x: 230, y: 100 },
			])

			// Both moves wait for one frame, which applies them together.
			expect(scaleOf(container)).toBe(1)

			await clock.advance(20)

			expect(scaleOf(container)).toBeCloseTo(3, 3)
		})
	})
})

/**
 * A browser captures a touch pointer on contact, onto the region or the mark
 * under the finger. jsdom captures nothing on contact, so these cases send the
 * events that a browser sends for that capture.
 */
describe('MapPlat touch over the marks', () => {
	/** Lands a finger on the first region. A touch reads nothing, so no readout rises. */
	function landFinger(container: HTMLElement, pointerId: number) {
		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		const at = { pointerId, pointerType: 'touch', clientX: 40, clientY: 20 }

		fireEvent.pointerEnter(region, at)

		fireEvent.pointerDown(region, at)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		return region
	}

	/** Points a mouse at the region. The readout rises unless a pinch holds it. */
	function pointMouse(region: SVGPathElement) {
		fireEvent.pointerEnter(region, { pointerId: 9, pointerType: 'mouse', clientX: 40, clientY: 20 })
	}

	it('keeps a touch pan when the plot takes the finger from the region under it', () => {
		const { container, plot } = renderZoomable(DIRECT)

		fireEvent.keyDown(plot, { key: '+' })

		const region = landFinger(container, 1)

		fireEvent.pointerMove(region, { pointerId: 1, pointerType: 'touch', clientX: 20, clientY: 10 })

		// The pan took the finger onto the plot, so the region lost it. That loss
		// bubbles to the plot, and it is not the end of the pan.
		fireEvent.lostPointerCapture(region, { pointerId: 1, pointerType: 'touch' })

		const before = transformOf(container)

		fireEvent.pointerMove(plot, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 })

		expect(transformOf(container)).not.toBe(before)
	})

	it('reads nothing from a pinch, then lets a mouse read, on a map that claims touch', () => {
		const { container, plot } = renderZoomable(DIRECT)

		const region = landFinger(container, 1)

		fireEvent.pointerDown(plot, { pointerId: 2, pointerType: 'touch', clientX: 80, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// The region holds the first finger's capture, so it gets the moves of that
		// finger. None of them raises the readout while the pinch holds it.
		fireEvent.pointerMove(region, { pointerId: 1, pointerType: 'touch', clientX: 30, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		for (const pointerId of [1, 2]) fireEvent.pointerUp(plot, { pointerId, pointerType: 'touch' })

		// The pinch has settled, so a mouse on the region reads it again.
		pointMouse(region)

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()
	})

	it('reads nothing from a pinch, then lets a mouse read, on a default map', () => {
		const { container, svg } = renderZoomable()

		const region = landFinger(container, 1)

		touch(svg, 'touchStart', [{ id: 1, x: 40, y: 20 }])

		touch(svg, 'touchStart', [
			{ id: 1, x: 40, y: 20 },
			{ id: 2, x: 80, y: 20 },
		])

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.pointerMove(region, { pointerId: 1, pointerType: 'touch', clientX: 30, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		touch(svg, 'touchEnd', [])

		pointMouse(region)

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()
	})

	it('keeps a finger in the pinch after the node under it leaves the tree', () => {
		const { container, svg } = renderZoomable()

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		const a = { identifier: 1, clientX: 190, clientY: 100, target: region }

		const b = { identifier: 2, clientX: 210, clientY: 100, target: svg }

		fireEvent.touchStart(region, { touches: [a], changedTouches: [a] })

		fireEvent.touchStart(svg, { touches: [a, b], changedTouches: [b] })

		// A zoom out merges the dots, and the hit circle under a finger unmounts. Its
		// touch events still go to it, and a detached node passes nothing up.
		const parent = present<Element>(region.parentNode as Element, 'region layer')

		const next = region.nextSibling

		region.remove()

		const moved = { ...a, clientX: 170 }

		const spread = { ...b, clientX: 230 }

		fireEvent.touchMove(region, { touches: [moved, spread], changedTouches: [moved] })

		fireEvent.touchEnd(region, { touches: [spread], changedTouches: [moved] })

		fireEvent.touchEnd(svg, { touches: [], changedTouches: [spread] })

		parent.insertBefore(region, next)

		// The spread went from 20 to 60, so the scale is three times the fit.
		expect(scaleOf(container)).toBeCloseTo(3, 3)
	})

	it('keeps a finger in the pinch when the frame resizes under it', () => {
		const { container, svg, rerender } = renderZoomable()

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		const a = { identifier: 1, clientX: 190, clientY: 100, target: region }

		const b = { identifier: 2, clientX: 210, clientY: 100, target: svg }

		fireEvent.touchStart(region, { touches: [a], changedTouches: [a] })

		fireEvent.touchStart(svg, { touches: [a, b], changedTouches: [b] })

		// The browser bar slides away mid-pinch, and the frame takes the new size.
		rerender(categoricalPlat({ zoom: true, width: 420 }))

		const parent = present<Element>(region.parentNode as Element, 'region layer')

		const next = region.nextSibling

		region.remove()

		const moved = { ...a, clientX: 170 }

		const spread = { ...b, clientX: 230 }

		fireEvent.touchMove(region, { touches: [moved, spread], changedTouches: [moved] })

		fireEvent.touchEnd(region, { touches: [spread], changedTouches: [moved] })

		fireEvent.touchEnd(svg, { touches: [], changedTouches: [spread] })

		parent.insertBefore(region, next)

		expect(scaleOf(container)).toBeCloseTo(3, 3)
	})

	it('binds its native listeners once, not once per frame size', () => {
		const { svg, rerender } = renderZoomable()

		const add = vi.spyOn(svg, 'addEventListener')

		const remove = vi.spyOn(svg, 'removeEventListener')

		rerender(categoricalPlat({ zoom: true, width: 420 }))

		rerender(categoricalPlat({ zoom: true, width: 440 }))

		expect(add).not.toHaveBeenCalled()

		expect(remove).not.toHaveBeenCalled()
	})
})

describe('MapPlat pinch under the page', () => {
	it('holds the ground under the fingers while the page scrolls under the pinch', () => {
		const { container, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		touch(svg, 'touchStart', [
			{ id: 1, x: 180, y: 100 },
			{ id: 2, x: 220, y: 100 },
		])

		// A scroll that the first finger started cannot be canceled. iOS carries
		// the page 30px up under the pinch, and the map and the fingers go with it.
		vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -30, 400, 200))

		fireEvent.scroll(window)

		act(() => {
			touch(svg, 'touchMove', [
				{ id: 1, x: 180, y: 70 },
				{ id: 2, x: 220, y: 70 },
			])
		})

		touch(svg, 'touchEnd', [])

		// The pair moved with the map, not over it, so the view holds.
		expect(transformOf(container)).toBe(before)
	})

	it("cancels Safari's own pinch over a zooming map", () => {
		const { svg } = renderZoomable()

		const gesture = new Event('gesturestart', { bubbles: true, cancelable: true })

		svg.dispatchEvent(gesture)

		expect(gesture.defaultPrevented).toBe(true)
	})

	it("leaves Safari's pinch alone over a map that does not zoom", () => {
		const { svg } = renderZoomable({ zoom: undefined })

		const gesture = new Event('gesturestart', { bubbles: true, cancelable: true })

		svg.dispatchEvent(gesture)

		expect(gesture.defaultPrevented).toBe(false)
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

		// The seam is stated once on the region layer's own group and inherited by
		// every path under it, so what the browser draws is this width scaled by the
		// k the zoom applies above. Dividing it out is the whole rule: one device
		// pixel, at every scale the view takes. To three places, because that is
		// where `transformAttribute` rounds the scale the width is read back
		// against — a hairline out by a ten-thousandth.
		const layer = bySlot(container, 'map-regions')

		// Two scales sit above the width now: the zoom's, and the refit the layer
		// carries its own paths on. One device pixel is the product of both.
		expect(Number(layer?.getAttribute('stroke-width')) * k * layerScale(layer)).toBeCloseTo(
			REGION_STROKE_WIDTH,
			3,
		)
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
	it('takes two moves that land before a render, so the pan keeps up with the pointer', () => {
		/** Drags from one point to another, through a halfway point when `split` asks. */
		function pan(split: boolean) {
			const { container, plot, svg } = renderZoomable()

			zoomWheel(svg, -400)

			fireEvent.pointerDown(plot, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })

			act(() => {
				if (split) fireEvent.pointerMove(plot, { pointerId: 1, clientX: 170, clientY: 80 })

				fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })
			})

			fireEvent.pointerUp(plot, { pointerId: 1 })

			return transformOf(container)
		}

		expect(pan(true)).toBe(pan(false))
	})

	it('moves the view on a drag once it passes the threshold', () => {
		const { container, plot, svg } = renderZoomable()

		zoomWheel(svg, -400)

		const before = transformOf(container)

		drag(plot, { x: 200, y: 100 }, { x: 160, y: 80 })

		expect(transformOf(container)).not.toBe(before)
	})

	it('takes the pointer once the press becomes a pan, and lets it go on release', () => {
		const { plot } = renderZoomable()

		fireEvent.pointerDown(plot, { pointerId: 1, button: 0, clientX: 200, clientY: 100 })

		// A press is not a gesture yet. A capture here would retarget the click that
		// a region pick needs.
		expect(plot.hasPointerCapture(1)).toBe(false)

		fireEvent.pointerMove(plot, { pointerId: 1, clientX: 140, clientY: 60 })

		expect(plot.hasPointerCapture(1)).toBe(true)

		fireEvent.pointerUp(plot, { pointerId: 1 })

		expect(plot.hasPointerCapture(1)).toBe(false)
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

		rerender(categoricalPlat({ zoom: true, geography: one }))

		expect(transformOf(container)).toBe('translate(0 0) scale(1)')
	})
})

describe('MapPlat onViewChange', () => {
	it('reports the transform the layer draws after a wheel', () => {
		const onViewChange = vi.fn()

		const { container, svg } = renderZoomable({ onViewChange })

		// A fitted map is the rest state, not a transition.
		expect(onViewChange).not.toHaveBeenCalled()

		zoomWheel(svg, -100)

		expect(onViewChange).toHaveBeenCalledOnce()

		const reported = onViewChange.mock.calls.at(-1)?.[0] as {
			x: number
			y: number
			k: number
		}

		// The report and the attribute are the same view, which is the point: the
		// package's own tests had to regex this out of the DOM. The attribute rounds
		// for the DOM, so they agree to its precision rather than exactly.
		expect(reported.k).toBeCloseTo(scaleOf(container), 2)

		expect(reported.k).toBeGreaterThan(1)
	})

	it('reports each notch of a gesture, not only its end', () => {
		const onViewChange = vi.fn()

		const { svg } = renderZoomable({ onViewChange })

		zoomWheel(svg, -100)

		zoomWheel(svg, -100)

		expect(onViewChange).toHaveBeenCalledTimes(2)
	})

	// Zooming out stops at the fit, so a second notch there writes the same
	// transform and has nothing to report.
	it('says nothing for a notch that cannot move the view', () => {
		const onViewChange = vi.fn()

		const { svg } = renderZoomable({ onViewChange })

		zoomWheel(svg, 100)

		expect(onViewChange).not.toHaveBeenCalled()
	})

	it('says nothing on a map that does not zoom', () => {
		const onViewChange = vi.fn()

		const { svg } = renderZoomable({ zoom: false, onViewChange })

		zoomWheel(svg, -100)

		expect(onViewChange).not.toHaveBeenCalled()
	})
})
