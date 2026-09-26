import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { BarChart } from '../../modules/chart'
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
})
