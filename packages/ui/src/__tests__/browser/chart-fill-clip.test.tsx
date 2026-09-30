import { describe, expect, it } from 'vitest'
import { DonutChart } from '../../modules/chart/donut-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { allBySlot, getSlot, renderUI } from '../helpers'

/**
 * A chart that fills its box adds no scroll range to that box. The content box of
 * a dashboard tile scrolls a widget that is taller than it. A fill chart is never
 * taller, but on a touch screen the touch target of a legend control reaches past
 * the control. At the bottom edge of the chart, it reached past the box, and the
 * tile scrolled a few pixels with nothing to show.
 *
 * This suite cannot match `pointer: coarse` (see `touch-target-geometry.test.tsx`).
 * The case therefore gives the touch target of the last legend control the coarse
 * floor, 2.75rem, by hand. Only computed layout gives the scroll range, so the case
 * runs in the browser.
 */
describe('fill chart in a scroll box (real browser)', () => {
	const DATA = [
		{ product: 'Tea', total: 30 },
		{ product: 'Coffee', total: 50 },
		{ product: 'Cocoa', total: 20 },
	]

	const LAYOUT: DashboardLayoutItem[] = [{ id: 'mix', x: 0, y: 0, w: 24 }]

	it('keeps the touch target of a legend control out of the scroll of the tile', async () => {
		const { container } = renderUI(
			<div style={{ width: 360 }}>
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					<DashboardTile id="mix" title="Product mix" ratio={16 / 9}>
						<DonutChart
							aria-label="Revenue by product"
							data={DATA}
							series={[{ xKey: 'product', yKey: 'total' }]}
							aspectRatio={false}
						/>
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		await expect.poll(() => allBySlot(container, 'chart-legend-item').length).toBe(3)

		const box = getSlot(container, 'dashboard-tile-content')

		const control = allBySlot(container, 'chart-legend-item').at(-1) as HTMLElement

		const target = control.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]')

		expect(target).not.toBeNull()

		target?.style.setProperty('height', '2.75rem')

		// The target now reaches past the bottom of the control.
		expect(target?.getBoundingClientRect().bottom).toBeGreaterThan(
			control.getBoundingClientRect().bottom + 1,
		)

		// The chart fills the box, and the box has no range to scroll.
		expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight)
	})
})
