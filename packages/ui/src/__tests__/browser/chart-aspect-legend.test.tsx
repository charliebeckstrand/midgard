import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * A side (left / right) legend keeps the `aspectRatio` on the plot box and bands
 * beside it, so the drawing holds its ratio regardless of the rail's width
 * rather than squeezing into the space the rail leaves. That the plot's rendered
 * box actually resolves to 16:9 beside the scaling rail (`min(16rem, 40cqw)`) is a
 * computed-layout claim — flex sizing and CSS `aspect-ratio` — that jsdom can't
 * measure, so it rides the real browser.
 */
describe('chart aspect ratio with a side legend (real browser)', () => {
	// The side-by-side row and the rail are `@sm`-gated on the chart's own width
	// (384px); the 800px chart below clears it, so the row layout — not the stack —
	// is what these assertions measure.
	beforeAll(() => page.viewport(960, 700))

	const months = [
		{ month: 'Jan', revenue: 40, costs: 24 },
		{ month: 'Feb', revenue: 52, costs: 28 },
		{ month: 'Mar', revenue: 47, costs: 30 },
		{ month: 'Apr', revenue: 63, costs: 35 },
	]

	it('draws the plot at 16:9 beside the legend rather than squeezing it', async () => {
		const { container } = renderUI(
			// A definite width for the flex row to divide between the plot and the
			// rail (min(16rem, 40cqw) — 16rem here, capped); the plot fills the
			// remainder and reserves 16:9 of it.
			<div style={{ width: 800 }}>
				<BarChart
					aria-label="Revenue and costs by month, legend right"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					aspectRatio={16 / 9}
					legend="right"
				/>
			</div>,
		)

		const figure = bySlot(container, 'chart-figure') as HTMLElement
		const box = bySlot(container, 'aspect-ratio') as HTMLElement
		const legend = bySlot(container, 'chart-legend') as HTMLElement

		// The plot box carries the ratio itself — the figure reserves none, so the
		// drawing can't be squeezed to fit the whole chart into 16:9.
		expect(figure.style.aspectRatio).toBe('')

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		const boxRect = box.getBoundingClientRect()

		// The rendered drawing box resolves to 16:9 — the whole point: a side legend
		// no longer narrows the plot's own ratio.
		expect(boxRect.width / boxRect.height).toBeCloseTo(16 / 9, 1)

		const legendRect = legend.getBoundingClientRect()

		// The legend bands to the right of the plot — a real side-by-side row — and
		// takes its own rail (~16rem here), so the plot spans only the remainder (well
		// under the 800px chart) yet still holds its ratio.
		expect(legendRect.left).toBeGreaterThanOrEqual(boxRect.right - 1)

		expect(boxRect.width).toBeLessThan(600)
		expect(boxRect.width).toBeGreaterThan(400)
	})
})
