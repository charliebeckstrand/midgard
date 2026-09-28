import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import {
	CHART_FIGURE_GAP,
	CHART_HEADER_LINE_GAP,
	CHART_HEADER_LINE_HEIGHT,
	CHART_LEGEND_ROW_HEIGHT,
	chartChromeReserve,
} from '../../modules/chart/engine/chart-tier'
import { getSlot, renderUI, waitFor } from '../helpers'

/**
 * The tier subtracts `chartChromeReserve` from the figure box and does not measure the chrome. The
 * constants that the reserve adds up must therefore agree with the boxes that the header, the
 * legend, and the figure gap render. This measures each box at every density scope and under an
 * inherited font size smaller and larger than the root size.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const DATA = [
	{ month: 'Jan', revenue: 42, costs: 28 },
	{ month: 'Feb', revenue: 51, costs: 30 },
]

const SERIES = [
	{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
] as const

const DENSITIES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const INHERITED = ['text-sm', 'text-base', 'text-lg'] as const

const height = (el: Element) => el.getBoundingClientRect().height

describe('chart chrome reserve (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	for (const inherited of INHERITED) {
		for (const density of DENSITIES) {
			it(`matches the rendered chrome at ${density} density under ${inherited}`, async () => {
				const { container } = renderUI(
					<div data-density={density} className={inherited} style={{ width: 800 }}>
						<BarChart
							aria-label="Revenue and costs by month"
							title="Revenue & costs"
							subtitle="Last six months"
							data={DATA}
							series={[...SERIES]}
						/>
					</div>,
				)

				const legend = await waitFor(() => getSlot(container, 'chart-legend'))

				const figure = getSlot(container, 'chart-figure')

				expect(height(getSlot(container, 'chart-title'))).toBe(CHART_HEADER_LINE_HEIGHT)

				expect(height(getSlot(container, 'chart-subtitle'))).toBe(CHART_HEADER_LINE_HEIGHT)

				expect(getComputedStyle(getSlot(container, 'chart-header')).rowGap).toBe(
					`${CHART_HEADER_LINE_GAP}px`,
				)

				expect(height(legend)).toBe(CHART_LEGEND_ROW_HEIGHT)

				expect(getComputedStyle(figure).rowGap).toBe(`${CHART_FIGURE_GAP}px`)

				// The sum is the claim that the tier depends on.
				expect(
					height(getSlot(container, 'chart-header')) + height(legend) + 2 * CHART_FIGURE_GAP,
				).toBe(chartChromeReserve({ headerLines: 2, legend: true }))
			})
		}
	}
})
