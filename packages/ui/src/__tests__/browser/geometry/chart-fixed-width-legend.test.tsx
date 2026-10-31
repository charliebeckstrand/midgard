import type { ReactElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { HeatmapChart } from '../../../modules/chart/heatmap-chart'
import { LineChart } from '../../../modules/chart/line-chart'
import { PieChart } from '../../../modules/chart/pie-chart'
import { ScatterChart } from '../../../modules/chart/scatter-chart'
import { getSlot, renderUI, waitFor } from '../../helpers'
import { HALF_PIXEL, PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A fixed `width` sizes the whole chart. A side legend takes a share of that
 * width, so the plot box is narrower than the chart. The drawing must fit the
 * plot box, because an SVG at the full width clips at the right edge of the
 * box. The flex row and the rail width are computed layout, which jsdom cannot
 * measure, so the suite runs in the real browser.
 */
beforeAll(() => page.viewport(960, 700))

/** Checks that the legend sits beside the plot and that the drawing fits the plot box. */
const expectDrawingInPlot = vi.defineHelper(async (plot: HTMLElement, legend: HTMLElement) => {
	const svg = plot.querySelector('svg')

	if (!svg) throw new Error('no plot SVG')

	await waitFor(() => expect(plot.getBoundingClientRect().width).toBeGreaterThan(0))

	const plotRect = plot.getBoundingClientRect()

	// The legend bands to the right of the plot, so it takes a share of the width.
	expect(legend.getBoundingClientRect().left).toBeGreaterThanOrEqual(plotRect.right - PIXEL)

	await waitFor(() =>
		expect(svg.getBoundingClientRect().width).toBeLessThanOrEqual(plotRect.width + HALF_PIXEL),
	)

	expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(Math.ceil(plotRect.width))
})

describe('fixed-width chart with a side legend (real browser)', () => {
	it.for<{ name: string; element: ReactElement; legendSlot: string }>([
		{
			name: 'line: draws the plot inside the box that the legend leaves',
			element: (
				<LineChart
					aria-label="Revenue and costs by quarter"
					data={[
						{ quarter: 'Q1', revenue: 40, costs: 24 },
						{ quarter: 'Q2', revenue: 80, costs: 31 },
						{ quarter: 'Q3', revenue: 65, costs: 28 },
					]}
					series={[
						{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
					]}
					width={400}
					legend="right"
				/>
			),
			legendSlot: 'chart-legend',
		},
		{
			name: 'pie: draws the pie inside the box that the legend leaves',
			element: (
				<PieChart
					aria-label="Traffic by source"
					data={[
						{ source: 'Search', visits: 60 },
						{ source: 'Direct', visits: 25 },
						{ source: 'Referral', visits: 15 },
					]}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					width={400}
					legend="right"
				/>
			),
			legendSlot: 'chart-legend',
		},
		{
			name: 'scatter: draws the plot inside the box that the legend leaves',
			element: (
				<ScatterChart
					aria-label="Dwell against distance"
					data={[
						{ distance: 12, dwell: 34, wait: 20 },
						{ distance: 20, dwell: 40, wait: 26 },
						{ distance: 28, dwell: 31, wait: 18 },
					]}
					series={[
						{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
						{ xKey: 'distance', yKey: 'wait', yName: 'Wait' },
					]}
					width={400}
					legend="right"
				/>
			),
			legendSlot: 'chart-legend',
		},
		{
			name: 'heatmap: draws the grid inside the box that the rail leaves',
			element: (
				<HeatmapChart
					aria-label="Commits"
					data={[
						{ day: 'Mon', hour: '9', commits: 1 },
						{ day: 'Mon', hour: '10', commits: 9 },
						{ day: 'Tue', hour: '9', commits: 5 },
						{ day: 'Tue', hour: '10', commits: 3 },
					]}
					series={[
						{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#fff', '#000'] },
					]}
					width={480}
					legend="right"
				/>
			),
			legendSlot: 'heatmap-legend-box',
		},
	])('$name', async ({ element, legendSlot }) => {
		const { container } = renderUI(element)

		await expectDrawingInPlot(getSlot(container, 'chart-plot'), getSlot(container, legendSlot))
	})
})
