import { describe, expect, it } from 'vitest'
import { BarChart } from '../../../modules/chart'
import { Dashboard, DashboardTile } from '../../../modules/dashboard'
import { frames, getSlot, renderUI } from '../../helpers'

/**
 * A chart with its menu button marks the header row of its tile `data-own-fullscreen`,
 * so the tile shows one way to go large. The menu button of the chart shows only on
 * a coarse pointer, and the tile then hides its expand control. The page has a touch
 * screen. `dashboard-tile-expand.test.tsx` holds the expand control of a fine pointer.
 */
describe('dashboard tile expand control on a coarse pointer (real browser)', () => {
	const data = [
		{ quarter: 'Q1', revenue: 10 },
		{ quarter: 'Q2', revenue: 20 },
	]

	it('hides the expand control beside a chart with its menu button', async () => {
		const { container } = renderUI(
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board">
					<DashboardTile id="revenue" title="Revenue" expandable>
						<BarChart
							aria-label="Revenue"
							contextMenu={{ button: true }}
							data={data}
							series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
						/>
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		await frames()

		expect(document.querySelector('[data-own-fullscreen]')).not.toBeNull()

		expect(getSlot(container, 'chart-menu-button')).toBeVisible()

		expect(getSlot(container, 'dashboard-tile-expand')).not.toBeVisible()
	})
})
