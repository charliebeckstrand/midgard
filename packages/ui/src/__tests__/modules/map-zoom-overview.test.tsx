import { describe, expect, it, vi } from 'vitest'
import { bySlot, fireEvent, within } from '../helpers'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * The overview inset of a zoomed map: a thumbnail of the whole geography that
 * shows while the view is zoomed in. A press on it centers the view on the
 * ground under it, and a drag moves the view along.
 */

/** Where the inset sits, and its width. Its height takes the ratio of the frame. */
const INSET_BOX = { left: 300, top: 150, width: 100 } as const

/** Renders a zooming plat, which shows the inset by default, and zooms it in with the key. */
function renderOverview(extra?: Parameters<typeof categoricalPlat>[0]) {
	const view = renderNavigable(categoricalPlat({ zoom: true, ...extra }))

	const inset = () => bySlot(view.container, 'map-zoom-overview')

	const zoomIn = () => fireEvent.keyDown(view.plot, { key: '+' })

	const transform = () => bySlot(view.container, 'map-zoom')?.getAttribute('transform')

	/** The frame of the plat, from the viewBox of its SVG. */
	const [, , width = 0, height = 0] = (view.svg.getAttribute('viewBox') ?? '')
		.split(' ')
		.map(Number)

	const box = { ...INSET_BOX, height: (INSET_BOX.width * height) / width }

	/** Gives the thumbnail its box, which jsdom reports as zero. */
	const measure = () => {
		const node = inset()?.querySelector('svg') ?? null

		if (node === null) throw new Error('no inset to measure')

		vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
			...box,
			x: box.left,
			y: box.top,
			right: box.left + box.width,
			bottom: box.top + box.height,
			toJSON: () => ({}),
		})
	}

	return { ...view, inset, zoomIn, transform, measure, frame: { width, height }, box }
}

describe('MapZoomOverview', () => {
	it('shows only while the view is zoomed in', () => {
		const { inset, zoomIn, plot } = renderOverview()

		expect(inset()).toBeNull()

		zoomIn()

		expect(inset()).toHaveAttribute('aria-hidden', 'true')

		fireEvent.keyDown(plot, { key: '0' })

		expect(inset()).toBeNull()
	})

	it('shows by default after one press of the zoom-in button', () => {
		const { inset, container } = renderOverview()

		fireEvent.click(within(container).getByRole('button', { name: 'Zoom in' }))

		expect(inset()).toHaveAttribute('aria-hidden', 'true')
	})

	it('shows none with `zoomOverview={false}`, or on a map that does not zoom', () => {
		const off = renderOverview({ zoomOverview: false })

		off.zoomIn()

		expect(off.inset()).toBeNull()

		off.unmount()

		const flat = renderOverview({ zoom: undefined })

		expect(flat.inset()).toBeNull()
	})

	it('centers the view on the ground under a press, and follows a drag', () => {
		const { inset, zoomIn, transform, measure, frame, box } = renderOverview()

		// Three steps, so the view has room to put a point a quarter in at its middle.
		zoomIn()
		zoomIn()
		zoomIn()

		measure()

		const node = inset() as HTMLElement

		// The middle of the top left quarter of the thumbnail: a quarter of the frame in on each axis.
		fireEvent.pointerDown(node, {
			pointerId: 1,
			button: 0,
			isPrimary: true,
			clientX: box.left + box.width / 4,
			clientY: box.top + box.height / 4,
		})

		const [x = 0, y = 0, k = 1] = (transform()?.match(/-?[\d.]+/g) ?? []).map(Number)

		expect((frame.width / 4) * k + x).toBeCloseTo(frame.width / 2, 2)

		expect((frame.height / 4) * k + y).toBeCloseTo(frame.height / 2, 2)

		const pressed = transform()

		fireEvent.pointerMove(node, {
			pointerId: 1,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
		})

		expect(transform()).not.toBe(pressed)

		fireEvent.pointerUp(node, { pointerId: 1 })
	})

	it('follows only the pointer that pressed it', () => {
		const { inset, zoomIn, transform, measure, box } = renderOverview()

		zoomIn()
		zoomIn()
		zoomIn()

		measure()

		const node = inset() as HTMLElement

		fireEvent.pointerDown(node, {
			pointerId: 1,
			button: 0,
			isPrimary: true,
			clientX: box.left + box.width / 4,
			clientY: box.top + box.height / 4,
		})

		const pressed = transform()

		// A second finger lands on the inset, moves, and lifts.
		fireEvent.pointerDown(node, {
			pointerId: 2,
			button: 0,
			isPrimary: false,
			clientX: box.left + (box.width * 3) / 4,
			clientY: box.top + (box.height * 3) / 4,
		})

		fireEvent.pointerMove(node, {
			pointerId: 2,
			clientX: box.left + (box.width * 3) / 4,
			clientY: box.top + (box.height * 3) / 4,
		})

		expect(transform()).toBe(pressed)

		fireEvent.pointerUp(node, { pointerId: 2 })

		// The first finger still holds the inset, so its move still aims the view.
		fireEvent.pointerMove(node, {
			pointerId: 1,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
		})

		expect(transform()).not.toBe(pressed)

		fireEvent.pointerUp(node, { pointerId: 1 })
	})

	it('refuses a second primary press while a pointer holds it', () => {
		const { inset, zoomIn, transform, measure, box } = renderOverview()

		zoomIn()
		zoomIn()
		zoomIn()

		measure()

		const node = inset() as HTMLElement

		fireEvent.pointerDown(node, {
			pointerId: 1,
			pointerType: 'pen',
			button: 0,
			isPrimary: true,
			clientX: box.left + box.width / 4,
			clientY: box.top + box.height / 4,
		})

		const pressed = transform()

		// A resting palm: the first touch is primary for its own type.
		fireEvent.pointerDown(node, {
			pointerId: 2,
			pointerType: 'touch',
			button: 0,
			isPrimary: true,
			clientX: box.left + (box.width * 3) / 4,
			clientY: box.top + (box.height * 3) / 4,
		})

		expect(transform()).toBe(pressed)

		fireEvent.pointerUp(node, { pointerId: 2 })

		// The pen still holds the inset, so its move still aims the view.
		fireEvent.pointerMove(node, {
			pointerId: 1,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
		})

		expect(transform()).not.toBe(pressed)

		fireEvent.pointerUp(node, { pointerId: 1 })
	})

	it('keeps the press from the pan surface under it', () => {
		const { inset, zoomIn, transform, measure, box } = renderOverview()

		zoomIn()

		measure()

		const node = inset() as HTMLElement

		const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }

		fireEvent.pointerDown(node, { pointerId: 1, button: 0, isPrimary: true, ...at })

		fireEvent.pointerUp(node, { pointerId: 1, ...at })

		const aimed = transform()

		// A move with no press held moves nothing: the plot never took the press.
		fireEvent.pointerMove(node, { pointerId: 1, clientX: box.left + 5, clientY: box.top + 5 })

		expect(transform()).toBe(aimed)
	})
})
