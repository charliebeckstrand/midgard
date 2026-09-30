import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { TOUCH_HOLD_SELECTION_SETTLE } from '../../hooks/use-touch-hold-selection'
import { BarChart, DonutChart } from '../../modules/chart'
import { act, bySlot, fireEvent, renderUI, screen } from '../helpers'

/**
 * A touch hold on a chart reads the chart and opens no context menu.
 *
 * A chart has a context menu by default. A context Menu opens on a touch long press, but a hold
 * on a chart opens the readout (#1396). The chart root marks itself `data-touch-readout`, so the
 * menu leaves the hold to the readout. A right-click still opens the menu.
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

	// A chart with no click handler still opens the readout under a hold, so each
	// touch press arms the selection guard (#1697 armed it only with a click handler).
	const guarded = () => document.documentElement.classList.contains('select-none')

	/** Holds a touch on the element, lifts it, and checks the guard on each side of the settle. */
	function holdAndLift(target: Element) {
		fireEvent.pointerDown(target, { pointerType: 'touch', isPrimary: true, pointerId: 1 })

		expect(guarded()).toBe(true)

		const lift = new Event('pointerup', { bubbles: true })

		Object.defineProperty(lift, 'pointerId', { value: 1 })

		act(() => {
			window.dispatchEvent(lift)

			vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE)
		})

		expect(guarded()).toBe(false)
	}

	it('arms the selection guard on a cartesian chart with no click handler', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				width={400}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
			/>,
		)

		holdAndLift(bySlot(container, 'chart-hit') as Element)
	})

	it('arms the selection guard on a donut with no click handler', () => {
		const { container } = renderUI(
			<DonutChart
				aria-label="Revenue by quarter"
				width={300}
				height={200}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
			/>,
		)

		holdAndLift(bySlot(container, 'chart-slice') as Element)
	})
})
