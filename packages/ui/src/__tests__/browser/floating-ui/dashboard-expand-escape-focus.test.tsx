import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { bySlot, getSlot, renderUI, screen } from '../../helpers'

/**
 * The expand dialog of a tile opens over the board, often under the pointer. The
 * pointer then holds a readout on the chart in the dialog, and the first Escape
 * clears it. The focus must stay in the dialog then, not fall to the body. The
 * second Escape closes the dialog, and the focus goes back to the expand control.
 * The return needs the real focus manager, so this runs in the floating-ui suite.
 */
describe('dashboard expand dialog Escape (real focus manager)', () => {
	const DATA = [3, 8, 5, 9].map((value, index) => ({ week: `W${index + 1}`, value }))

	const LAYOUT: DashboardLayoutItem[] = [{ id: 'trend', x: 0, y: 0, w: 12, h: 30 }]

	it('keeps the focus in the dialog on the Escape that clears a readout, then returns it to the expand control', async () => {
		renderUI(
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					<DashboardTile id="trend" title="Trend" expandable minWidth={0}>
						<LineChart
							aria-label="Signups"
							data={DATA}
							series={[{ xKey: 'week', yKey: 'value', yName: 'Value' }]}
							aspectRatio={false}
							contextMenu={false}
						/>
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		const trigger = screen.getByRole('button', { name: 'Expand Trend' })

		await userEvent.click(trigger)

		const dialog = await screen.findByRole('dialog', { name: 'Trend' })

		// The dialog focuses the plot, its first tab stop, once the chart measures its box.
		await expect.poll(() => document.activeElement).toBe(bySlot(dialog, 'chart-plot'))

		const plot = getSlot(dialog, 'chart-plot')

		await userEvent.hover(getSlot(dialog, 'chart-hit'))

		await expect.poll(() => bySlot(document.body, 'tooltip-content')).not.toBeNull()

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => bySlot(document.body, 'tooltip-content')).toBeNull()

		expect(dialog.isConnected).toBe(true)

		expect(document.activeElement).toBe(plot)

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => screen.queryByRole('dialog', { name: 'Trend' })).toBeNull()

		await expect.poll(() => document.activeElement).toBe(trigger)
	})
})
