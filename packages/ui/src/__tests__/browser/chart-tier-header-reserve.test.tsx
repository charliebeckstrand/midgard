import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { renderUI, waitFor } from '../helpers'

/**
 * The tier reserves the header band under a real engine. A stacked aspect-fill
 * chart resolves its tier against the figure's `width / ratio` less the chrome
 * it lays out around the plot — the header and the legend. The header reaches the
 * frame through the accessible-name spread, so the tier hook must read the title
 * and subtitle too, else it under-reserves and a narrow titled chart reads a
 * crushed compact plot where it should shed its chrome for a clean sparkline.
 * This pins the boundary: at 300px a titled, legended chart reads spark, while
 * the same chart without a title stays compact — so the title provably moves the
 * tier, which it cannot if the hook never sees it.
 */

const DATA = [
	{ month: 'Jan', revenue: 42, costs: 28 },
	{ month: 'Feb', revenue: 51, costs: 30 },
]

const SERIES = [
	{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
] as const

function tierOf(container: HTMLElement): string | undefined {
	return container.querySelector<HTMLElement>('[data-slot="chart"]')?.dataset.tier
}

describe('chart tier header reserve (real browser)', () => {
	it('sheds a narrow titled chart to spark once the header band is reserved', async () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<BarChart
					aria-label="Revenue and costs by month"
					title="Revenue & costs"
					subtitle="Last six months"
					data={DATA}
					series={[...SERIES]}
				/>
			</div>,
		)

		await waitFor(() => expect(tierOf(container)).toBe('spark'))

		// Spark drops the legend with the rest of the chrome.
		expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull()
	})

	it('keeps the same untitled chart compact, so the header provably moves the tier', async () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<BarChart aria-label="Revenue and costs by month" data={DATA} series={[...SERIES]} />
			</div>,
		)

		// No header band to reserve, so the taller plot clears the spark floor and the
		// frame keeps its chrome — the legend still shows.
		await waitFor(() => expect(tierOf(container)).toBe('compact'))

		expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeNull()
	})
})
