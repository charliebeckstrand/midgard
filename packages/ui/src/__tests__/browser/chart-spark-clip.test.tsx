import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { BarChart } from '../../modules/chart/bar-chart'
import { BubbleChart } from '../../modules/chart/bubble-chart'
import { ComboChart } from '../../modules/chart/combo-chart'
import { DonutChart } from '../../modules/chart/donut-chart'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { renderUI, waitFor } from '../helpers'

/**
 * The spark box holds every mark it draws: one sweep across the chart family,
 * each type at spark size in its most clip-prone configuration — point markers,
 * value labels, negative extremes, bubbles — asserting no painted element's
 * rendered box crosses the drawing box. The layouts reserve each chart's mark
 * reach on every plot edge when the axis chrome is off (`markInset`), so the
 * marks that used to border the frame — a bottom point's lower half, an
 * endpoint's ring at the side — clear it instead of clipping. Painted extents
 * are computed layout jsdom can't resolve, so the sweep rides the real browser.
 */

/** Painted-ink slack: antialiasing and stroke rounding, not real overhang. */
const SLACK = 0.75

const CATEGORIES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

/** Values that pin both extremes mid-series, so edge and interior marks both border. */
const SERIES_DATA = CATEGORIES.map((label, index) => ({
	label,
	first: [45, 91, 60, 12, 74, 30, 88, 52][index] as number,
	second: [12, 40, 25, 91, 33, 71, 20, 66][index] as number,
}))

const NEGATIVES = CATEGORIES.slice(0, 5).map((label, index) => ({
	label,
	value: [40, -25, 65, -80, 30][index] as number,
}))

const GRID = ['x', 'y', 'z'].flatMap((row, ri) =>
	['1', '2', '3', '4'].map((col, ci) => ({ row, col, value: ri + ci })),
)

const SLICES = [
	{ kind: 'a', share: 40 },
	{ kind: 'b', share: 30 },
	{ kind: 'c', share: 20 },
	{ kind: 'd', share: 10 },
]

/**
 * Every painted element in the chart's plot SVGs sits inside its SVG's own
 * rendered box. The hit rects span the plot by design and take no ink, so they
 * sit out; everything else — marks, rings, labels, rules — must clear.
 */
async function expectNoClip(container: HTMLElement) {
	await waitFor(() => {
		const svgs = [
			...container.querySelectorAll('[data-slot="chart-plot"] svg, [data-slot="heatmap-plot"] svg'),
		]

		expect(svgs.length).toBeGreaterThan(0)

		for (const svg of svgs) {
			const clip = svg.getBoundingClientRect()

			expect(clip.width).toBeGreaterThan(0)

			for (const el of svg.querySelectorAll('circle, rect, path, line, polyline, text')) {
				const slot = el.getAttribute('data-slot') ?? ''

				if (slot === 'chart-hit' || slot === 'heatmap-hit') continue

				const box = el.getBoundingClientRect()

				if (box.width === 0 && box.height === 0) continue

				const overhang = Math.max(
					clip.left - box.left,
					box.right - clip.right,
					clip.top - box.top,
					box.bottom - clip.bottom,
				)

				expect
					.soft(overhang, `${el.tagName}[data-slot="${slot}"] paints ${overhang}px outside`)
					.toBeLessThanOrEqual(SLACK)
			}
		}
	})
}

const SPARK = { width: 150, height: 96 }

describe('spark box holds every mark (real browser)', () => {
	it('line with points and value labels', async () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Line spark"
				data={SERIES_DATA}
				series={[
					{ xKey: 'label', yKey: 'first', yName: 'First' },
					{ xKey: 'label', yKey: 'second', yName: 'Second' },
				]}
				points
				labels={{ endpoints: true, extremes: true }}
				{...SPARK}
			/>,
		)

		await expectNoClip(container)

		// The labels themselves stand down at spark — bare marks only.
		expect(container.querySelectorAll('[data-slot="chart-value-labels"] text')).toHaveLength(0)
	})

	it('area, stacked with points and value labels', async () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Area spark"
				data={SERIES_DATA}
				series={[
					{ xKey: 'label', yKey: 'first', yName: 'First' },
					{ xKey: 'label', yKey: 'second', yName: 'Second' },
				]}
				stacked
				points
				labels={{ endpoints: true, extremes: true }}
				{...SPARK}
			/>,
		)

		await expectNoClip(container)
	})

	it('bar across negative extremes, both orientations', async () => {
		const vertical = renderUI(
			<BarChart
				aria-label="Bar spark"
				data={NEGATIVES}
				series={[{ xKey: 'label', yKey: 'value', yName: 'Value' }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(vertical.container)

		const horizontal = renderUI(
			<BarChart
				aria-label="Bar spark horizontal"
				data={NEGATIVES}
				series={[{ xKey: 'label', yKey: 'value', yName: 'Value' }]}
				orientation="horizontal"
				{...SPARK}
			/>,
		)

		await expectNoClip(horizontal.container)
	})

	it('combo of bars and pointed lines', async () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Combo spark"
				data={SERIES_DATA}
				series={[
					{ type: 'bar', xKey: 'label', yKey: 'first', yName: 'First' },
					{ type: 'line', xKey: 'label', yKey: 'second', yName: 'Second' },
				]}
				{...SPARK}
			/>,
		)

		await expectNoClip(container)
	})

	it('scatter and bubble discs', async () => {
		const scatter = renderUI(
			<ScatterChart
				aria-label="Scatter spark"
				data={SERIES_DATA}
				series={[{ xKey: 'first', yKey: 'second' }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(scatter.container)

		const bubble = renderUI(
			<BubbleChart
				aria-label="Bubble spark"
				data={SERIES_DATA.map((row, index) => ({ ...row, size: (index + 1) * 12 }))}
				series={[{ xKey: 'first', yKey: 'second', sizeKey: 'size' }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(bubble.container)
	})

	it('heatmap cells', async () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Heatmap spark"
				data={GRID}
				series={[{ xKey: 'col', yKey: 'row', colorKey: 'value', colorRange: ['#eef', '#00a'] }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(container)
	})

	it('pie and donut', async () => {
		const pie = renderUI(
			<PieChart
				aria-label="Pie spark"
				data={SLICES}
				series={[{ xKey: 'kind', yKey: 'share' }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(pie.container)

		const donut = renderUI(
			<DonutChart
				aria-label="Donut spark"
				data={SLICES}
				series={[{ xKey: 'kind', yKey: 'share' }]}
				{...SPARK}
			/>,
		)

		await expectNoClip(donut.container)
	})
})
