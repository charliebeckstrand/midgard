import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * A side legend lays out against the chart's own container width, not the
 * viewport: a `@container` on the chart root gates the side-by-side row on `@sm`
 * (384px) and reserves a rail that scales with the container (`min(16rem,
 * 40cqw)`). So a chart in a narrow column stacks its legend below — plot at full
 * width, never squeezed to a sliver — even on a wide screen, and sits the legend
 * beside only once its own box has room, the rail taking a share of that box
 * rather than a fixed column. Both are computed-layout facts (container queries,
 * flex direction, `cqw`) jsdom can't resolve.
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

	it('sits the legend beside the plot and scales the rail with the container', async () => {
		// 500px is past the `@sm` engage width (384) but well under the old `@xl`
		// (576) — the rail now engages here, where it once still stacked.
		const { container } = renderUI(<div style={{ width: 500 }}>{chart()}</div>)

		const body = bySlot(container, 'chart-body') as HTMLElement
		const legend = bySlot(container, 'chart-legend') as HTMLElement
		const box = bySlot(container, 'aspect-ratio') as HTMLElement

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		// Container ≥ @sm: the query fires, so the plot-and-legend body is a row
		// (the figure stays a column, banding any header above it).
		expect(getComputedStyle(body).flexDirection).toBe('row')

		// The rail is 40cqw (~200px here), not the old fixed 256 column — it scales
		// with the container, so it never dominates a modest chart.
		const railWidth = legend.getBoundingClientRect().width

		expect(railWidth).toBeGreaterThan(160)

		expect(railWidth).toBeLessThan(240)

		// The plot holds 16:9 and spans only the remainder beside the rail.
		const boxRect = box.getBoundingClientRect()

		expect(boxRect.width / boxRect.height).toBeCloseTo(16 / 9, 1)

		expect(boxRect.width).toBeLessThan(320)
	})

	it('stacks the legend below and gives the plot full width in a narrow container', async () => {
		const { container } = renderUI(<div style={{ width: 340 }}>{chart()}</div>)

		const body = bySlot(container, 'chart-body') as HTMLElement
		const box = bySlot(container, 'aspect-ratio') as HTMLElement

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		// Container < @sm: the query does not fire, so the body stacks (column) and
		// the plot is NOT squeezed to the remainder beside a rail.
		expect(getComputedStyle(body).flexDirection).toBe('column')

		// The plot takes essentially the full 340px column (minus padding), not the
		// remainder a beside-the-rail layout would leave it — the usable-size guarantee.
		expect(box.getBoundingClientRect().width).toBeGreaterThan(300)
	})
})
