import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart'
import { Dashboard, DashboardTile } from '../../modules/dashboard'
import { frames, renderUI, screen } from '../helpers'

/**
 * A chart with its menu button marks the header row of its tile `data-own-fullscreen`,
 * so the tile shows one way to go large. The chart's menu button shows only on
 * a coarse pointer. On a fine pointer, the tile therefore keeps its expand
 * control. jsdom applies no Tailwind CSS, so this suite rides the real browser,
 * whose primary pointer is fine.
 */
describe('dashboard tile expand control (real browser)', () => {
	const data = [
		{ quarter: 'Q1', revenue: 10 },
		{ quarter: 'Q2', revenue: 20 },
	]

	it('shows the expand control on a fine pointer beside a chart with its menu button', async () => {
		renderUI(
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

		expect(matchMedia('(pointer: fine)').matches).toBe(true)

		expect(document.querySelector('[data-own-fullscreen]')).not.toBeNull()

		expect(screen.getByRole('button', { name: 'Expand Revenue' })).toBeVisible()
	})
})
