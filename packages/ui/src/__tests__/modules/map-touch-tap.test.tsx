import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPoint } from '../../modules/map'
import { MAP_DOUBLE_TAP_SLOP, MAP_DOUBLE_TAP_WINDOW } from '../../modules/map/use-map-touch-tap'
import { bySlot, fireEvent, firstRegion, present, renderUI } from '../helpers'
import { categoricalPlat, overlayPlat } from '../helpers/map-plat'

/** The fixture spans lon 0–30, lat 0–10; this projects inside the frame. */
const DEPOT: [number, number] = [5, 5]

/** The clock that the double tap reads. */
let now = 0

beforeEach(() => {
	now = 1_000

	vi.spyOn(performance, 'now').mockImplementation(() => now)
})

afterEach(() => {
	vi.restoreAllMocks()

	document.elementFromPoint = undefined as never
})

/**
 * Taps one finger on `target` at a point, as a browser sends it: the enter, the
 * press, the lift, and the touch end. jsdom has no layout, so the point names
 * `target` as the element under it.
 */
function tap(target: Element, x = 40, y = 20, pointerId = 1) {
	document.elementFromPoint = vi.fn().mockReturnValue(target)

	const at = { pointerId, pointerType: 'touch', clientX: x, clientY: y }

	fireEvent.pointerEnter(target, at)

	fireEvent.pointerDown(target, at)

	fireEvent.pointerUp(target, at)

	fireEvent.touchEnd(target)
}

describe('MapPlat touch taps', () => {
	it('picks nothing and shows no readout on one tap', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		// The click that a browser can still send after the touch.
		fireEvent.click(region)

		expect(onRegionClick).not.toHaveBeenCalled()

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('picks the region under a double tap, once', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		now += MAP_DOUBLE_TAP_WINDOW - 50

		tap(region, 44, 22)

		expect(onRegionClick).toHaveBeenCalledTimes(1)

		expect(onRegionClick.mock.calls[0]?.[1]).toBe(Number(region.getAttribute('data-region-index')))

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('picks the dot under a double tap', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			overlayPlat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={onClick} />),
		)

		const dot = present(bySlot(container, 'map-point-hit'), 'point hit')

		tap(dot)

		expect(onClick).not.toHaveBeenCalled()

		tap(dot)

		expect(onClick).toHaveBeenCalledWith('depot', 0)
	})

	it('picks nothing from two taps too far apart in time or in space', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		tap(region)

		now += MAP_DOUBLE_TAP_WINDOW + 1

		tap(region)

		now += 100

		tap(region, 40 + MAP_DOUBLE_TAP_SLOP + 1, 20)

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('starts a new pair after a double tap', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		for (let i = 0; i < 3; i++) {
			tap(region)

			now += 100
		}

		expect(onRegionClick).toHaveBeenCalledTimes(1)
	})

	it('picks nothing from a pinch', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ onRegionClick }))

		const region = present<SVGPathElement>(firstRegion(container), 'region path')

		document.elementFromPoint = vi.fn().mockReturnValue(region)

		for (let i = 0; i < 2; i++) {
			for (const pointerId of [1, 2]) {
				fireEvent.pointerDown(region, { pointerId, pointerType: 'touch', clientX: 40, clientY: 20 })
			}

			for (const pointerId of [1, 2]) {
				fireEvent.pointerUp(region, { pointerId, pointerType: 'touch', clientX: 40, clientY: 20 })
			}

			now += 100
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
