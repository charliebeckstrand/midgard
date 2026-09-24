import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../modules/chart/line-chart'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { bySlot, getSlot, renderUI, screen } from '../helpers'

/**
 * A dialog around a chart closes on Escape. The dialog focuses the chart's plot
 * when it opens, and the plot handles Escape itself. The plot therefore claims the
 * press only when it clears a live readout; else the press reaches the dialog.
 * Real focus management and real key presses need the browser, so this runs in
 * the browser suite, through the expand dialog of a dashboard tile.
 */
describe('chart Escape inside an overlay (real browser)', () => {
	const DATA = [3, 8, 5, 9].map((value, index) => ({ week: `W${index + 1}`, value }))

	const LAYOUT: DashboardLayoutItem[] = [{ id: 'trend', x: 0, y: 0, w: 12, h: 30 }]

	function Board() {
		return (
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" layout={{ value: LAYOUT }}>
					<DashboardTile id="trend" title="Trend" expandable minWidth={0}>
						<LineChart
							aria-label="Signups"
							data={DATA}
							series={[{ xKey: 'week', yKey: 'value', yName: 'Value' }]}
							aspectRatio={false}
						/>
					</DashboardTile>
				</Dashboard>
			</div>
		)
	}

	/** Opens the expand dialog, and focuses its chart once the plot is a tab stop. */
	async function expand() {
		await userEvent.click(screen.getByRole('button', { name: 'Expand Trend' }))

		const dialog = await screen.findByRole('dialog', { name: 'Trend' })

		// The plot becomes a tab stop once the chart measures its box.
		await expect.poll(() => bySlot(dialog, 'chart-plot')?.getAttribute('tabindex')).toBe('0')

		const plot = getSlot(dialog, 'chart-plot')

		plot.focus()

		expect(document.activeElement).toBe(plot)

		return dialog
	}

	it('closes on Escape while its chart holds the focus with no readout', async () => {
		renderUI(<Board />)

		await expand()

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => screen.queryByRole('dialog', { name: 'Trend' })).toBeNull()
	})

	it('clears a readout on the first Escape, and closes on the second', async () => {
		renderUI(<Board />)

		const dialog = await expand()

		await userEvent.keyboard('{ArrowRight}')

		await expect.poll(() => bySlot(document.body, 'tooltip-content')).not.toBeNull()

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => bySlot(document.body, 'tooltip-content')).toBeNull()

		expect(dialog.isConnected).toBe(true)

		await userEvent.keyboard('{Escape}')

		await expect.poll(() => screen.queryByRole('dialog', { name: 'Trend' })).toBeNull()
	})
})
