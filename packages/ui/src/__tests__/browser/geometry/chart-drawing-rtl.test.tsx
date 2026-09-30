import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { LineChart } from '../../../modules/chart/line-chart'
import { getSlot, present, renderUI, waitFor } from '../../helpers'

/**
 * A chart drawing is physical in a right-to-left page. The SVG reads its text
 * anchors left to right, so an end-anchored label still ends at its anchor. A
 * side legend keeps the side that `legend` names. Before, a right-to-left page
 * flipped the anchors, so the value labels ran into the plot, and a legend
 * placed `right` drew on the left. Layout needs the browser.
 */
beforeAll(() => page.viewport(960, 800))

const DATA = ['Jan', 'Feb', 'Mar', 'Apr'].map((month, index) => ({
	month,
	revenue: 40 + index * 7,
	costs: 20 + index * 3,
}))

const SERIES = [
	{ xKey: 'month' as const, yKey: 'revenue' as const, yName: 'Revenue' },
	{ xKey: 'month' as const, yKey: 'costs' as const, yName: 'Costs' },
]

/** Renders a two-series line chart in a right-to-left page, with its legend at `legend`. */
async function rtlChart(legend: 'left' | 'right') {
	const { container } = renderUI(
		<div dir="rtl" style={{ width: 720 }}>
			<LineChart
				aria-label="Revenue and costs by month"
				data={DATA}
				series={SERIES}
				legend={legend}
				animate={false}
			/>
		</div>,
	)

	const svg = () =>
		present(container.querySelector<SVGSVGElement>('[data-slot="chart-plot"] svg'), 'plot svg')

	await waitFor(() => expect(svg().getBoundingClientRect().width).toBeGreaterThan(0))

	return { container, svg: svg() }
}

describe('a chart drawing in a right-to-left page (real browser)', () => {
	it('keeps a side legend on the side that it names', async () => {
		const left = await rtlChart('left')

		expect(
			getSlot(left.container, 'chart-legend').getBoundingClientRect().right,
		).toBeLessThanOrEqual(left.svg.getBoundingClientRect().left + 1)

		const right = await rtlChart('right')

		expect(
			getSlot(right.container, 'chart-legend').getBoundingClientRect().left,
		).toBeGreaterThanOrEqual(right.svg.getBoundingClientRect().right - 1)
	})

	it('ends each value tick label at the gutter, clear of the plot', async () => {
		const { container, svg } = await rtlChart('right')

		const ticks = [...getSlot(container, 'chart-axis-y').querySelectorAll('text')]

		expect(ticks.length).toBeGreaterThan(1)

		expect(getComputedStyle(svg).direction).toBe('ltr')

		// The labels anchor at their end, left of the plot. Read in a right-to-left
		// direction, that end was the left of the text, and each label ran right,
		// into the plot.
		const gridStart = Math.min(
			...[...container.querySelectorAll('[data-slot="chart-grid-lines"] line')].map(
				(line) => line.getBoundingClientRect().left,
			),
		)

		for (const tick of ticks) {
			expect(tick.getBoundingClientRect().right).toBeLessThanOrEqual(gridStart + 1)
		}
	})
})
