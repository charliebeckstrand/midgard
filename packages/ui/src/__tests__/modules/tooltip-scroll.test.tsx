import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { MapPlat } from '../../modules/map'
import { act, allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
] as const

/** A viewport rect for the hit element, so the settle resolve can bound the pointer. */
function boxOf(el: Element, right: number, bottom: number): void {
	vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		left: 0,
		top: 0,
		right,
		bottom,
		width: right,
		height: bottom,
		toJSON: () => ({}),
	} as DOMRect)
}

/** Record the pointer's viewport position for the next settle. */
function movePointer(x: number, y: number): void {
	window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()

	vi.restoreAllMocks()

	document.elementFromPoint = undefined as never
})

describe('tooltip across a scroll', () => {
	it('chart: hides on scroll, then re-reads the band under the settled pointer', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={DATA} series={[...SERIES]} width={400} />,
		)

		const hit = bySlot(container, 'chart-hit') as Element

		boxOf(hit, 400, 240)

		// Hover Q3; the readout appears and the pointer is recorded.
		act(() => fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 }))

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		// A scroll hides it at once...
		act(() => fireEvent.scroll(window))

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// ...and once the scroll settles it returns over the same band — no move.
		act(() => vi.advanceTimersByTime(150))

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')
	})

	it('chart: keeps a keyboard-driven readout through a scroll with no pointer engaged', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={DATA} series={[...SERIES]} width={400} />,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Drive the readout by keyboard, never pointing the plot.
		act(() => plot.focus())

		act(() => fireEvent.keyDown(plot, { key: 'ArrowRight' }))

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		// The scroll rescue is a pointer affordance; with no pointer over the plot it
		// must leave the keyboard readout be rather than clearing it.
		act(() => fireEvent.scroll(window))

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()
	})

	it('chart: stays hidden when the settled pointer rests off the plot', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={DATA} series={[...SERIES]} width={400} />,
		)

		const hit = bySlot(container, 'chart-hit') as Element

		boxOf(hit, 400, 240)

		act(() => fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 }))

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		// The scroll carried the plot out from under the pointer, now past its right edge.
		movePointer(900, 100)

		act(() => fireEvent.scroll(window))

		act(() => vi.advanceTimersByTime(150))

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('map: hides on scroll, then re-reads the region under the settled pointer', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Zones"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				width={400}
			/>,
		)

		const [alpha] = allBySlot(container, 'map-region')

		// jsdom has no layout, so name the region the settled pointer lands on.
		document.elementFromPoint = vi.fn().mockReturnValue(alpha ?? null)

		act(() => fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 }))

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Alpha')

		movePointer(40, 20)

		act(() => fireEvent.scroll(window))

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		act(() => vi.advanceTimersByTime(150))

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Alpha')
	})

	it('map: stays hidden when the settled pointer rests off every region', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Zones"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				width={400}
			/>,
		)

		const [alpha] = allBySlot(container, 'map-region')

		act(() => fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 }))

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		// Settle over the ocean — nothing resolves under the pointer.
		document.elementFromPoint = vi.fn().mockReturnValue(null)

		movePointer(40, 20)

		act(() => fireEvent.scroll(window))

		act(() => vi.advanceTimersByTime(150))

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})
})
