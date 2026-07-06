import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { PieChart } from '../../../modules/chart/pie-chart'
import { allBySlot, renderUI, screen } from '../../helpers'

/**
 * Legend truncation tooltip against the real floating engine and real layout.
 * The jsdom suite can't see overflow and mocks `@floating-ui/react`, so the
 * hover tooltip only surfaces here. The side panel reserves a fixed column, so
 * an over-long slice label clips and must reveal its full text on hover.
 */
describe('chart legend truncation tooltip (real browser)', () => {
	const longLabel = 'A carrier name far too long to fit the reserved legend column'

	it('reveals the full label on hover when a panel entry is clipped', async () => {
		await page.viewport(960, 640)

		const { container } = renderPie()

		// The clipped entry (a whole switch) — hovering it, overlay and all, must
		// surface the tooltip, not the hidden data table's copy of the name.
		const entry = allBySlot(container, 'chart-legend-item')[0] as HTMLElement

		await userEvent.hover(entry)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longLabel)
	})

	it('opens no tooltip on an entry whose label fits the column', async () => {
		await page.viewport(960, 640)

		const { container } = renderPie()

		// "XPO" fits the reserved column, so hovering it must not arm the tooltip.
		const entry = allBySlot(container, 'chart-legend-item')[1] as HTMLElement

		await userEvent.hover(entry)

		// The tooltip would open at the 250ms hover delay if enabled; wait past it
		// (no pointer-leave to cancel) and assert none surfaced.
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	function renderPie() {
		return renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={[
					{ source: longLabel, visits: 60 },
					{ source: 'XPO', visits: 40 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={640}
				height={320}
				legend="right"
			/>,
		)
	}
})
