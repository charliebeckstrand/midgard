import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * A side legend lays out against the chart's own container width, not the
 * viewport: a `@container` on the chart root gates the side-by-side row (and the
 * legend's fixed column) on `@xl`. So a chart in a narrow column stacks its
 * legend below — plot at full width, never squeezed to a sliver — even on a wide
 * screen, and sits the legend beside only when its own box has room. Both are
 * computed-layout facts (container queries, flex direction) jsdom can't resolve.
 */
describe('chart side-legend container query (real browser)', () => {
	// Wide viewport throughout: the query must respond to the chart's own width, so
	// the viewport must never be the thing that changes the outcome.
	beforeAll(() => page.viewport(1200, 700))

	const chart = () => (
		<BarChart
			aria-label="Revenue and costs by month, legend right"
			data={[
				{ month: 'Jan', revenue: 40, costs: 24 },
				{ month: 'Feb', revenue: 52, costs: 28 },
				{ month: 'Mar', revenue: 47, costs: 30 },
			]}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			aspectRatio={16 / 9}
			legend="right"
		/>
	)

	it('sits the legend beside the plot in a wide container', async () => {
		const { container } = renderUI(<div style={{ width: 720 }}>{chart()}</div>)

		const figure = bySlot(container, 'chart-figure') as HTMLElement
		const box = bySlot(container, 'aspect-ratio') as HTMLElement

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		// Container ≥ @xl (576px): the query fires, so the figure is a row.
		expect(getComputedStyle(figure).flexDirection).toBe('row')

		// The plot holds 16:9 and spans only the remainder beside the ~256px panel.
		const boxRect = box.getBoundingClientRect()

		expect(boxRect.width / boxRect.height).toBeCloseTo(16 / 9, 1)

		expect(boxRect.width).toBeLessThan(560)
	})

	it('stacks the legend below and gives the plot full width in a narrow container', async () => {
		const { container } = renderUI(<div style={{ width: 420 }}>{chart()}</div>)

		const figure = bySlot(container, 'chart-figure') as HTMLElement
		const box = bySlot(container, 'aspect-ratio') as HTMLElement

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		// Container < @xl: the query does not fire, so the legend stacks (column) and
		// the plot is NOT squeezed to the remainder beside a 256px panel.
		expect(getComputedStyle(figure).flexDirection).toBe('column')

		// The plot takes essentially the full 420px column (minus padding), not the
		// ~150px a beside-the-panel layout would leave it — the usable-size guarantee.
		expect(box.getBoundingClientRect().width).toBeGreaterThan(380)
	})
})
