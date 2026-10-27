// @vitest-environment node
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { DonutChart } from '../../modules/chart/donut-chart'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'

/**
 * The server markup of a chart that measures its own width.
 *
 * The server has no width, so the frame has no measurement. The chart must
 * still draw its header and its legend, as the hydrated chart does. The plot
 * box stays empty until the measure: no placeholder, and no drawing at a
 * width the chart does not have. A chart that reads the missing width as a
 * sparkline drops all of its chrome until hydration.
 */
const DATA = [
	{ q: 'Q1', revenue: 10, costs: 6 },
	{ q: 'Q2', revenue: 30, costs: 12 },
	{ q: 'Q3', revenue: 24, costs: 18 },
]

const TWO_SERIES = [
	{ xKey: 'q', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'q', yKey: 'costs', yName: 'Costs' },
] as const

/** The count of each `data-slot` in the markup. */
function slots(markup: string, slot: string): number {
	return markup.split(`data-slot="${slot}"`).length - 1
}

const charts: [string, ReactElement][] = [
	[
		'bar',
		<BarChart
			key="bar"
			aria-label="Revenue"
			title="Revenue"
			data={DATA}
			series={[...TWO_SERIES]}
		/>,
	],
	[
		'scatter',
		<ScatterChart
			key="scatter"
			aria-label="Costs against revenue"
			title="Costs against revenue"
			data={DATA}
			series={[
				{ xKey: 'revenue', yKey: 'costs', yName: 'Costs' },
				{ xKey: 'costs', yKey: 'revenue', yName: 'Revenue' },
			]}
		/>,
	],
	[
		'donut',
		<DonutChart
			key="donut"
			aria-label="Revenue by quarter"
			title="Revenue by quarter"
			data={DATA}
			series={[{ xKey: 'q', yKey: 'revenue' }]}
		/>,
	],
]

describe('unmeasured chart server markup', () => {
	it.each(charts)('draws the %s chrome around an empty plot box', (_name, chart) => {
		const markup = renderToString(chart)

		expect(markup).not.toContain('data-tier="spark"')

		expect(slots(markup, 'chart-header')).toBe(1)

		expect(slots(markup, 'chart-legend-item')).toBeGreaterThanOrEqual(2)

		expect(slots(markup, 'chart-plot')).toBe(1)

		expect(slots(markup, 'placeholder')).toBe(0)

		expect(markup).not.toContain('<svg aria-hidden="true" direction="ltr"')
	})

	it('keeps the heatmap out of the spark tier', () => {
		const markup = renderToString(
			<HeatmapChart
				aria-label="Revenue by quarter"
				data={DATA}
				series={[
					{
						xKey: 'q',
						yKey: 'q',
						colorKey: 'revenue',
						colorRange: ['oklch(0.98 0.02 156)', 'oklch(0.53 0.14 150)'],
						colorName: 'Revenue',
					},
				]}
			/>,
		)

		expect(markup).not.toContain('data-tier="spark"')

		expect(slots(markup, 'chart-plot')).toBe(1)
	})
})
