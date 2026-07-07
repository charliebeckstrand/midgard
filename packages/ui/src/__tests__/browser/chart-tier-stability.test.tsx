import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { renderUI } from '../helpers'

/**
 * Tier stability at the spark boundary under a real engine. A legended, titled
 * chart on the default 16/9 figure shares its aspect box with the header and
 * legend, so measuring the plot's remainder to resolve the tier used to loop:
 * spark drops that chrome, the remainder jumps back above the spark floor, the
 * tier flips to compact, which restores the chrome and drops the remainder again
 * — an oscillation with no fixed point, seen on the docs page as a chart
 * flickering between two sizes at ~200px. The tier now resolves against the
 * figure's computed `width / ratio` less the chrome, a height no tier decision
 * perturbs, so it settles. This samples the published `data-tier` over many
 * frames and fails if it keeps flipping.
 */

const DATA = [
	{ month: 'Jan', revenue: 42, costs: 28 },
	{ month: 'Feb', revenue: 51, costs: 30 },
	{ month: 'Mar', revenue: 47, costs: 33 },
]

/** Two frames: one for the observer delivery, one for the commit to paint. */
function frames() {
	return new Promise((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(resolve))
	})
}

function chart() {
	return (
		<BarChart
			aria-label="Revenue and costs by month"
			title="Revenue & costs"
			subtitle="Last six months, in thousands"
			data={DATA}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
		/>
	)
}

/** Samples the resolved tier over ~40 frames and returns the run of values. */
async function sampleTiers(chartEl: HTMLElement): Promise<string[]> {
	const seen: string[] = []

	for (let i = 0; i < 40; i++) {
		await frames()

		seen.push(chartEl.dataset.tier ?? 'none')
	}

	return seen
}

describe('chart tier stability at the spark boundary (real browser)', () => {
	it('settles on one tier at ~200px instead of oscillating between spark and compact', async () => {
		const { container } = renderUI(
			<div data-testid="host" style={{ width: 240 }}>
				{chart()}
			</div>,
		)

		const chartEl = container.querySelector<HTMLElement>('[data-slot="chart"]')

		if (!chartEl) throw new Error('no chart rendered')

		const seen = await sampleTiers(chartEl)

		// The first sample may still carry the pre-measurement tier; after that the
		// run must hold one value. A loop would flip every couple of frames.
		const settled = seen.slice(2)

		const transitions = settled.filter((tier, index) => index > 0 && tier !== settled[index - 1])

		expect(transitions, `tiers over time: ${seen.join(' → ')}`).toHaveLength(0)
	})

	it('holds its settled tier steady as the frame is dragged across the boundary', async () => {
		const { container } = renderUI(
			<div data-testid="host" style={{ width: 320 }}>
				{chart()}
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		const chartEl = container.querySelector<HTMLElement>('[data-slot="chart"]')

		if (!host || !chartEl) throw new Error('no host or chart rendered')

		// Walk the width down through the spark boundary and back, the drag the docs
		// handle drives. At each stop the tier must settle rather than churn.
		for (const width of [320, 280, 240, 200, 180, 200, 240, 280, 320]) {
			host.style.width = `${width}px`

			const seen = await sampleTiers(chartEl)

			const settled = seen.slice(3)

			const transitions = settled.filter((tier, index) => index > 0 && tier !== settled[index - 1])

			expect(transitions, `at ${width}px: ${seen.join(' → ')}`).toHaveLength(0)
		}
	})
})
