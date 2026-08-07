import { describe, expect, it, vi } from 'vitest'
import { type MapFeatureCollection, MapPlat } from '../../modules/map'
import { act, bySlot, fireEvent, renderUI } from '../helpers'
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
	at = { clientX: 200, clientY: 100 },
): WheelEvent {
	const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...at })

	act(() => {
		svg.dispatchEvent(event)
	})

	return event
}

/** Presses, drags, and releases one pointer across the plot region. */
function drag(plot: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }) {
	fireEvent.pointerDown(plot, { pointerId: 1, button: 0, clientX: from.x, clientY: from.y })

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

	it('claims touch gestures only while it zooms', () => {
		expect(renderZoomable().plot).toHaveClass('touch-none')

		expect(renderZoomable({ zoom: undefined }).plot).not.toHaveClass('touch-none')
	})
})

describe('MapPlat wheel zoom', () => {
	it('zooms in and takes the gesture from the page', () => {
		const { container, svg } = renderZoomable()

		const event = wheel(svg, -200)

		expect(scaleOf(container)).toBeGreaterThan(1)

		expect(event.defaultPrevented).toBe(true)
	})

	it('leaves the page its scroll where the gesture moves nothing', () => {
		const { container, svg } = renderZoomable()

		// Zooming out at the fit is a no-op, so the reader is never trapped on the
		// map: the wheel falls through and the page scrolls.
		const event = wheel(svg, 200)

		expect(scaleOf(container)).toBe(1)

		expect(event.defaultPrevented).toBe(false)
	})

	it('stops at the ceiling the prop names', () => {
		const { container, svg } = renderZoomable({ zoom: 2 })

		wheel(svg, -2000)

		expect(scaleOf(container)).toBe(2)
	})

	it('scales the geography without reprojecting a single path', () => {
		const { container, svg } = renderZoomable()

		const before = [...container.querySelectorAll('[data-region-index]')].map((path) =>
			path.getAttribute('d'),
		)

		wheel(svg, -200)

		const after = [...container.querySelectorAll('[data-region-index]')].map((path) =>
			path.getAttribute('d'),
		)

		expect(after).toEqual(before)
	})

	it('holds every stroke at a hairline through the transform', () => {
		const { container, svg } = renderZoomable()

		wheel(svg, -200)

		const region = container.querySelector('[data-region-index]')

		expect(region?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
	})
})

describe('MapPlat pan', () => {
	it('moves the view on a drag once it passes the threshold', () => {
		const { container, plot, svg } = renderZoomable()

		wheel(svg, -400)

		const before = transformOf(container)

		drag(plot, { x: 200, y: 100 }, { x: 160, y: 80 })

		expect(transformOf(container)).not.toBe(before)
	})

	it('holds the view for a press that never travels', () => {
		const { container, plot, svg } = renderZoomable()

		wheel(svg, -400)

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

		wheel(svg, -400)

		expect(scaleOf(container)).toBeGreaterThan(1)

		const one: MapFeatureCollection = {
			type: 'FeatureCollection',
			features: FIXTURE_GEOJSON.features.slice(0, 1),
		}

		rerender(plat({ geography: one }))

		expect(transformOf(container)).toBe('translate(0 0) scale(1)')
	})
})
