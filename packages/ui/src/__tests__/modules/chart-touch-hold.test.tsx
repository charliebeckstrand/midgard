import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { TOUCH_TAP_WINDOW } from '../../hooks/use-touch-tap'
import { BarChart, DonutChart } from '../../modules/chart'
import { act, bySlot, fireEvent, renderUI, screen } from '../helpers'

/**
 * A touch hold on a chart does nothing: it opens no readout and no context menu.
 *
 * A chart has a context menu by default. A context Menu opens on a touch long press. The chart
 * root marks itself `data-touch-readout`, so the menu leaves a hold on a chart alone (#1396). A
 * touch reads nothing from the chart, so the hold opens no readout either. A right-click still
 * opens the menu, and "View data" in the menu shows the data.
 */
describe('a touch hold on a chart', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	const data = [
		{ quarter: 'Q1', revenue: 40 },
		{ quarter: 'Q2', revenue: 80 },
	]

	it('opens no context menu', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				width={400}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
			/>,
		)

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerDown(hit, {
			pointerType: 'touch',
			isPrimary: true,
			clientX: 280,
			clientY: 100,
		})

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY)
		})

		expect(screen.queryByRole('menu')).toBeNull()

		fireEvent.contextMenu(hit)

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	/** Holds a touch still on the element past the tap window, then lifts it. */
	function hold(target: Element) {
		const touch = { pointerType: 'touch', isPrimary: true, pointerId: 1 }

		fireEvent.pointerOver(target, touch)

		fireEvent.pointerDown(target, touch)

		act(() => {
			vi.advanceTimersByTime(TOUCH_TAP_WINDOW * 2)
		})

		expect(screen.queryByRole('tooltip')).toBeNull()

		fireEvent.pointerUp(target, touch)
	}

	it('opens no tooltip on a cartesian chart', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				width={400}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
			/>,
		)

		hold(bySlot(container, 'chart-hit') as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		expect(bySlot(container, 'chart-bar-spot')).toBeNull()
	})

	it('opens no tooltip on a donut', () => {
		const { container } = renderUI(
			<DonutChart
				aria-label="Revenue by quarter"
				width={300}
				height={200}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
			/>,
		)

		hold(bySlot(container, 'chart-slice') as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		expect(container.querySelector('.opacity-25')).toBeNull()
	})
})
