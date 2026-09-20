import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { bySlot, getSlot, present, renderUI, waitFor } from '../helpers'

/**
 * A side (left / right) legend keeps the `aspectRatio` on the plot box and bands
 * beside it, so the drawing holds its ratio regardless of the rail's width
 * rather than squeezing into the space the rail leaves. That the plot's rendered
 * box actually resolves to 16:9 beside the scaling rail (`min(16rem, 40cqw)`) is a
 * computed-layout claim — flex sizing and CSS `aspect-ratio` — that jsdom can't
 * measure, so it rides the real browser.
 */
// File scope, so both blocks below declare the same size. The side-by-side row
// and the rail are `@sm`-gated on the chart's own width (384px); the 800px chart
// clears it, so the row layout — not the stack — is what these assertions
// measure. The second block asserts pixels too, and a `beforeAll` inside the
// first would leave it running at whatever the page happened to hold.
beforeAll(() => page.viewport(960, 700))

describe('chart aspect ratio with a side legend (real browser)', () => {
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

		const figure = getSlot(container, 'chart-figure')
		const box = getSlot(container, 'aspect-ratio')
		const legend = getSlot(container, 'chart-legend')

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

/**
 * Where the ratio lives, and what fills it, measured rather than read off class
 * strings.
 *
 * A stacked (top / bottom) legend folds into the whole chart: the figure wrapper
 * carries the CSS aspect-ratio, the band takes its natural height, and the plot
 * draws into whatever that leaves. A side legend instead keeps the ratio on the
 * plot box and bands beside it. jsdom asserted all of this through
 * `figure.style.aspectRatio` and the presence of `flex-1`, `min-h-0` and
 * `size-full` in class strings — every one of which is there whether or not the
 * box resolves — and supplied the plot's measured remainder itself before
 * asserting the drawing followed it.
 */
describe('chart aspect ratio and legend placement, measured (real browser)', () => {
	const DATA = [
		{ quarter: 'Q1', revenue: 40, costs: 24 },
		{ quarter: 'Q2', revenue: 80, costs: 31 },
		{ quarter: 'Q3', revenue: 65, costs: 28 },
	]

	const SERIES = [
		{ xKey: 'quarter' as const, yKey: 'revenue' as const, yName: 'Revenue' },
		{ xKey: 'quarter' as const, yKey: 'costs' as const, yName: 'Costs' },
	]

	/** A legended bar chart in a definite-width box. */
	function chart(extra: Record<string, unknown>) {
		return renderUI(
			<div style={{ width: 600 }}>
				<BarChart aria-label="Revenue by quarter" data={DATA} series={SERIES} {...extra} />
			</div>,
		)
	}

	/** The plot SVG's `viewBox`, parsed by the engine rather than by hand. */
	function viewBox(container: HTMLElement): SVGRect {
		const svg = present(bySlot(container, 'chart-plot'), 'the plot region').querySelector('svg')

		if (!svg) throw new Error('no plot SVG')

		return svg.viewBox.baseVal
	}

	it('resolves the figure to the ratio and draws the plot into the legend remainder', async () => {
		const { container } = chart({ aspectRatio: 16 / 9, legend: 'bottom' })

		const figure = present(bySlot(container, 'chart-figure'), 'the figure')

		const plot = present(bySlot(container, 'chart-plot'), 'the plot region')

		const legend = present(bySlot(container, 'chart-legend'), 'the legend')

		await waitFor(() => expect(viewBox(container).height).toBeGreaterThan(0))

		// The whole chart holds the ratio, and it actually resolves to it.
		const box = figure.getBoundingClientRect()

		expect(box.width / box.height).toBeCloseTo(16 / 9, 1)

		// The plot reserves nothing of its own; it takes what the band leaves.
		expect(bySlot(container, 'aspect-ratio')).toBeNull()

		expect(legend.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			plot.getBoundingClientRect().bottom - 1,
		)

		// The drawing height is the measured remainder, not the ratio's full
		// height — which is the claim jsdom could only make by supplying the
		// remainder itself.
		expect(viewBox(container).height).toBeCloseTo(plot.clientHeight, 0)

		expect(viewBox(container).height).toBeLessThan(box.height)
	})

	it('bands a side legend beside the plot and keeps the ratio on the plot box', async () => {
		const { container } = chart({ aspectRatio: 16 / 9, legend: 'right' })

		const figure = present(bySlot(container, 'chart-figure'), 'the figure')

		const plot = present(bySlot(container, 'chart-plot'), 'the plot region')

		const legend = present(bySlot(container, 'chart-legend'), 'the legend')

		const reserve = present(bySlot(container, 'aspect-ratio'), 'the plot aspect box')

		await waitFor(() => expect(reserve.getBoundingClientRect().width).toBeGreaterThan(0))

		// The figure reserves nothing; the plot box carries the ratio itself.
		expect(figure.style.aspectRatio).toBe('')

		const drawn = reserve.getBoundingClientRect()

		expect(drawn.width / drawn.height).toBeCloseTo(16 / 9, 1)

		// Beside, not below: a real row.
		expect(legend.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			plot.getBoundingClientRect().right - 1,
		)
	})

	it('fills the plot into a definite container height under aspectRatio={false}', async () => {
		const { container } = renderUI(
			<div style={{ width: 600, height: 320 }}>
				<BarChart aria-label="Revenue by quarter" data={DATA} series={SERIES} aspectRatio={false} />
			</div>,
		)

		const plot = present(bySlot(container, 'chart-plot'), 'the plot region')

		await waitFor(() => expect(viewBox(container).height).toBeGreaterThan(0))

		// Free-form fill: the plot grows into the container's height rather than
		// reserving one from its own width and collapsing to the zero that reserve
		// would measure. jsdom read this off class strings.
		expect(plot.getBoundingClientRect().height).toBeGreaterThan(150)

		expect(viewBox(container).height).toBeCloseTo(plot.clientHeight, 0)
	})

	it('shares a square between a pie and its legend, filling the pie into the remainder', async () => {
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<PieChart
					aria-label="Share by quarter"
					data={DATA}
					series={[{ xKey: 'quarter', yKey: 'revenue' }]}
					aspectRatio={1}
					legend="bottom"
				/>
			</div>,
		)

		const figure = present(bySlot(container, 'chart-figure'), 'the figure')

		const plot = present(bySlot(container, 'chart-plot'), 'the plot region')

		await waitFor(() => expect(plot.getBoundingClientRect().height).toBeGreaterThan(0))

		// Three slices show a legend, so the square describes the whole chart and
		// the pie takes the remainder beneath the band.
		const box = figure.getBoundingClientRect()

		expect(box.width / box.height).toBeCloseTo(1, 1)

		expect(bySlot(container, 'aspect-ratio')).toBeNull()

		expect(plot.getBoundingClientRect().height).toBeLessThan(box.height)
	})
})
