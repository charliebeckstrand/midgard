import { describe, expect, vi } from 'vitest'
import { MULTI_TAP_WINDOW, TOUCH_TAP_WINDOW } from '../../hooks/use-touch-tap'
import type { ChartPress } from '../../modules/chart'
import { MapPoint } from '../../modules/map'
import { bySlot, fireEvent, firstRegion, present, renderUI } from '../helpers'
import { it } from '../helpers/fake-clock'
import { categoricalPlat, overlayPlat } from '../helpers/map-plat'
import { CLICK, TAP } from '../helpers/press'
import { stubElementFromPoint } from '../helpers/stub-element-from-point'

/** The fixture spans lon 0–30, lat 0–10; this projects inside the frame. */
const DEPOT: [number, number] = [5, 5]

/** A touch of the primary finger at a point. */
const finger = (x: number, y: number) => ({
	pointerId: 1,
	pointerType: 'touch',
	isPrimary: true,
	clientX: x,
	clientY: y,
})

/**
 * Taps one finger on `target` at a point, as a browser sends it: the enter, the
 * press, the lift, and the touch end. jsdom has no layout, so the point names
 * `target` as the element under it.
 */
function tap(target: Element, x = 40, y = 20) {
	stubElementFromPoint(target)

	fireEvent.pointerEnter(target, finger(x, y))

	fireEvent.pointerDown(target, finger(x, y))

	fireEvent.pointerUp(target, finger(x, y))

	fireEvent.touchEnd(target)
}

describe('MapPlat touch taps', () => {
	it('picks the region under one tap, once, and shows no readout', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		// The click that a browser can still send after the touch.
		fireEvent.click(region)

		expect(onRegionClick).toHaveBeenCalledExactlyOnceWith('A', 0, TAP)

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('picks once for each tap', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		tap(region)

		expect(onRegionClick).toHaveBeenCalledTimes(2)
	})

	it('picks the dot under one tap', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			overlayPlat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={onClick} />),
		)

		tap(present(bySlot(container, 'map-point-hit'), 'point hit'))

		expect(onClick).toHaveBeenCalledExactlyOnceWith('depot', TAP)
	})

	it('picks nothing from a tap on a disabled region', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick, isRegionDisabled: () => true }))

		tap(present<SVGPathElement>(firstRegion(container), 'region path'))

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('picks nothing from a drag', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		stubElementFromPoint(region)

		fireEvent.pointerDown(region, finger(40, 20))

		fireEvent.pointerMove(region, finger(40, 60))

		fireEvent.pointerUp(region, finger(40, 60))

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('picks nothing from a hold', async ({ clock }) => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		stubElementFromPoint(region)

		fireEvent.pointerDown(region, finger(40, 20))

		await clock.advance(TOUCH_TAP_WINDOW)

		fireEvent.pointerUp(region, finger(40, 20))

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('lets a handler gate on a double tap with the press', async ({ clock, signal }) => {
		const opened = vi.fn()

		const { container } = renderUI(
			categoricalPlat({
				onRegionClick: (id: string, _index: number, press: ChartPress) => {
					if (press.pointerType === 'touch' && press.count < 2) return

					opened(id)
				},
			}),
		)

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		expect(opened).not.toHaveBeenCalled()

		await clock.advance(MULTI_TAP_WINDOW - 100)

		signal.throwIfAborted()

		tap(region, 44, 22)

		expect(opened).toHaveBeenCalledExactlyOnceWith('A')
	})

	it('reports the click count of a mouse in the press', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		fireEvent.click(region, { detail: 1 })

		fireEvent.click(region, { detail: 2 })

		expect(onRegionClick.mock.calls.map((call) => call[2])).toEqual([
			CLICK,
			{ pointerType: 'mouse', count: 2 },
		])
	})

	it('picks nothing from a pinch', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		stubElementFromPoint(region)

		for (let i = 0; i < 2; i++) {
			for (const pointerId of [1, 2]) {
				fireEvent.pointerDown(region, {
					pointerId,
					pointerType: 'touch',
					isPrimary: pointerId === 1,
					clientX: 40,
					clientY: 20,
				})
			}

			for (const pointerId of [1, 2]) {
				fireEvent.pointerUp(region, {
					pointerId,
					pointerType: 'touch',
					isPrimary: pointerId === 1,
					clientX: 40,
					clientY: 20,
				})
			}
		}

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('keeps the mouse: one click picks, and hover reads', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		const at = { pointerId: 1, pointerType: 'mouse', clientX: 40, clientY: 20 }

		fireEvent.pointerEnter(region, at)

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		fireEvent.pointerDown(region, at)

		fireEvent.pointerUp(region, at)

		fireEvent.click(region)

		expect(onRegionClick).toHaveBeenCalledTimes(1)
	})
})
