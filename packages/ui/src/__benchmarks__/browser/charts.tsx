/**
 * One mount/update/destroy adapter for each chart family of the ui module. The
 * module renders through React (`createRoot` + `flushSync`), which is the
 * synchronous commit that the interaction handler of a consumer pays. The
 * animations are off, and each chart draws into the same fixed 800×450 box, so
 * no mount waits on a `ResizeObserver` before its first real paint.
 */

import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { BarChart } from '../../modules/chart/bar-chart'
import type { ChartSeries, ScatterChartSeries } from '../../modules/chart/engine/types'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import type { PointData, PointRow, TrendData, TrendRow } from './fixtures'

export const WIDTH = 800

export const HEIGHT = 450

/** A mounted chart under bench control. */
type Mounted<D> = {
	/** Redraws the chart from a replacement dataset of the same shape. */
	update: (data: D) => void | Promise<void>
	destroy: () => void
}

/** One entry in a scenario: a name for the report and a mount. */
export type Subject<D> = {
	name: string
	mount: (host: HTMLElement, data: D) => Mounted<D> | Promise<Mounted<D>>
}

/** Mounts a React tree synchronously and redraws through the same root. */
export function reactSubject<D>(name: string, element: (data: D) => ReactElement): Subject<D> {
	return {
		name,
		mount(host, data) {
			const root = createRoot(host)

			const draw = (next: D) => flushSync(() => root.render(element(next)))

			draw(data)

			return { update: draw, destroy: () => root.unmount() }
		},
	}
}

/** The ui series list for `seriesCount` trend fields (`s1`, `s2`, …). */
function trendSeries(seriesCount: number): ChartSeries<TrendRow>[] {
	return Array.from({ length: seriesCount }, (_, i) => ({
		xKey: 'label',
		yKey: `s${i + 1}`,
		yName: `Series ${i + 1}`,
	}))
}

/** The ui line chart over a categorical axis. */
export function lineCharts(seriesCount: number): Subject<TrendData>[] {
	return [
		reactSubject('ui LineChart', (data) => (
			<LineChart
				aria-label="Bench line"
				data={data.rows}
				series={trendSeries(seriesCount)}
				width={WIDTH}
			/>
		)),
	]
}

/** The ui grouped-bar chart over the same trend shape. */
export function barCharts(seriesCount: number): Subject<TrendData>[] {
	return [
		reactSubject('ui BarChart', (data) => (
			<BarChart
				aria-label="Bench bar"
				data={data.rows}
				series={trendSeries(seriesCount)}
				width={WIDTH}
			/>
		)),
	]
}

/** The ui scatter chart over numeric x/y points. */
export function scatterCharts(): Subject<PointData>[] {
	const series: ScatterChartSeries<PointRow>[] = [{ xKey: 'x', yKey: 'y', yName: 'Points' }]

	return [
		reactSubject('ui ScatterChart', (data) => (
			<ScatterChart aria-label="Bench scatter" data={data.rows} series={series} width={WIDTH} />
		)),
	]
}

/** The ui pie chart with callout labels, one slice for each trend row. */
export function pieCalloutCharts(): Subject<TrendData>[] {
	return [
		reactSubject('ui PieChart callouts', (data) => (
			<PieChart
				aria-label="Bench pie"
				data={data.rows}
				series={[{ xKey: 'label', yKey: 's1' }]}
				labels={{ callouts: true }}
				width={WIDTH}
			/>
		)),
	]
}

/** The row names of the heatmap, one for each series. Two are wider than the gutter room. */
const HEATMAP_ROWS = [
	'Organic search',
	'Direct',
	'Referral',
	'Social media',
	'Email newsletters',
	'Paid search',
	'Display',
	'Other',
]

/** One heatmap cell: a column, a row, and a value. */
type HeatmapCell = { col: string; row: string; value: number }

const heatmapCells = new WeakMap<TrendData, HeatmapCell[]>()

/**
 * The trend in long form: the categories across and one named row for each
 * series. It is built once for each trend, so the pivot is not on the clock.
 */
function heatmapData(data: TrendData): HeatmapCell[] {
	const hit = heatmapCells.get(data)

	if (hit) return hit

	const cells = data.rows.flatMap((row) =>
		HEATMAP_ROWS.slice(0, data.values.length).map((name, series) => ({
			col: String(row.label),
			row: name,
			value: Number(row[`s${series + 1}`] ?? 0),
		})),
	)

	heatmapCells.set(data, cells)

	return cells
}

/** The ui heatmap, with the categories across and one named row for each series. */
export function heatmapCharts(): Subject<TrendData>[] {
	return [
		reactSubject('ui HeatmapChart', (data) => (
			<HeatmapChart
				aria-label="Bench heatmap"
				data={heatmapData(data)}
				series={[
					{ xKey: 'col', yKey: 'row', colorKey: 'value', colorRange: ['#e0f2fe', '#0369a1'] },
				]}
				width={WIDTH}
			/>
		)),
	]
}
