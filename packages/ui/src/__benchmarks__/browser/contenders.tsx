/**
 * One mount/update/destroy adapter per library, per chart family, so every
 * bench times the same task through each contender's idiomatic API: the ui
 * module renders through React (`createRoot` + `flushSync` — the synchronous
 * commit a consumer's interaction handler pays), AG Charts and Highcharts
 * through their vanilla factories. Animations are disabled everywhere and
 * every chart draws at the same fixed 800×450 box, so no contender waits on
 * a ResizeObserver before its first real paint.
 *
 * AG Charts renders its scene on animation frames, so its adapter awaits
 * `waitForUpdate()` — without it the timed region would end before any
 * drawing happened. Highcharts and the ui module draw synchronously.
 */

import {
	type AgChartInstance,
	type AgChartOptions,
	AgCharts,
	AllCommunityModule,
	ModuleRegistry,
} from 'ag-charts-community'
import Highcharts from 'highcharts'
import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { BarChart } from '../../modules/chart/bar-chart'
import type { ChartSeries, ScatterChartSeries } from '../../modules/chart/chart-schema'
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import type { PointData, PointRow, TrendData, TrendRow } from './fixtures'

// AG Charts 14 draws nothing until its feature modules register; the
// community bundle is the library's own quick-start baseline.
ModuleRegistry.registerModules([AllCommunityModule])

export const WIDTH = 800

export const HEIGHT = 450

/** A mounted chart under bench control. */
export type Mounted<D> = {
	/** Redraws the chart from a replacement dataset of the same shape. */
	update: (data: D) => void | Promise<void>
	destroy: () => void
}

/** One library's entry in a scenario: a name for the report and a mount. */
export type Contender<D> = {
	name: string
	mount: (host: HTMLElement, data: D) => Mounted<D> | Promise<Mounted<D>>
}

/** Mounts a React tree synchronously and redraws through the same root. */
function reactContender<D>(name: string, element: (data: D) => ReactElement): Contender<D> {
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

/** Creates an AG chart and settles its frame-deferred scene render. */
function agContender<D>(name: string, options: (data: D) => AgChartOptions): Contender<D> {
	return {
		name,
		async mount(host, data) {
			const chart: AgChartInstance = AgCharts.create({
				...options(data),
				container: host,
				width: WIDTH,
				height: HEIGHT,
				animation: { enabled: false },
			} as AgChartOptions)

			await chart.waitForUpdate()

			return {
				async update(next) {
					chart.updateDelta({ data: options(next).data } as never)

					await chart.waitForUpdate()
				},
				destroy: () => chart.destroy(),
			}
		},
	}
}

/** Creates a Highcharts chart; its SVG build and redraws are synchronous. */
function hcContender<D>(
	name: string,
	options: (data: D) => Highcharts.Options,
	update: (chart: Highcharts.Chart, data: D) => void,
): Contender<D> {
	return {
		name,
		mount(host, data) {
			const chart = Highcharts.chart(host, {
				...options(data),
				chart: { width: WIDTH, height: HEIGHT, animation: false },
				title: { text: undefined },
				// Parity note, not a handicap: the a11y module isn't loaded, so this
				// only silences its absence warning. The ui charts keep their built-in
				// accessible output (hidden data table, roving focus) in every bench.
				accessibility: { enabled: false },
				plotOptions: { series: { animation: false } },
			})

			return {
				update(next) {
					update(chart, next)

					chart.redraw(false)
				},
				destroy: () => chart.destroy(),
			}
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

function hcTrendUpdate(chart: Highcharts.Chart, data: TrendData) {
	for (const [i, values] of data.values.entries()) {
		chart.series[i]?.setData(values, false, false)
	}
}

/** Line contenders over a shared categorical axis. */
export function lineContenders(seriesCount: number): Contender<TrendData>[] {
	return [
		reactContender('ui LineChart', (data) => (
			<LineChart
				aria-label="Bench line"
				data={data.rows}
				series={trendSeries(seriesCount)}
				width={WIDTH}
			/>
		)),
		agContender('AG Charts line', (data) => ({
			data: data.rows,
			series: Array.from({ length: seriesCount }, (_, i) => ({
				type: 'line' as const,
				xKey: 'label',
				yKey: `s${i + 1}`,
				yName: `Series ${i + 1}`,
			})),
		})),
		hcContender(
			'Highcharts line',
			(data) => ({
				xAxis: { categories: data.categories },
				series: data.values.map((values, i) => ({
					type: 'line' as const,
					name: `Series ${i + 1}`,
					data: values,
				})),
			}),
			hcTrendUpdate,
		),
	]
}

/** Grouped-column contenders over the same trend shape. */
export function barContenders(seriesCount: number): Contender<TrendData>[] {
	return [
		reactContender('ui BarChart', (data) => (
			<BarChart
				aria-label="Bench bar"
				data={data.rows}
				series={trendSeries(seriesCount)}
				width={WIDTH}
			/>
		)),
		agContender('AG Charts bar', (data) => ({
			data: data.rows,
			series: Array.from({ length: seriesCount }, (_, i) => ({
				type: 'bar' as const,
				xKey: 'label',
				yKey: `s${i + 1}`,
				yName: `Series ${i + 1}`,
			})),
		})),
		hcContender(
			'Highcharts column',
			(data) => ({
				xAxis: { categories: data.categories },
				series: data.values.map((values, i) => ({
					type: 'column' as const,
					name: `Series ${i + 1}`,
					data: values,
				})),
			}),
			hcTrendUpdate,
		),
	]
}

/** Scatter contenders over numeric x/y pairs. */
export function scatterContenders(): Contender<PointData>[] {
	const series: ScatterChartSeries<PointRow>[] = [{ xKey: 'x', yKey: 'y', yName: 'Points' }]

	return [
		reactContender('ui ScatterChart', (data) => (
			<ScatterChart aria-label="Bench scatter" data={data.rows} series={series} width={WIDTH} />
		)),
		agContender('AG Charts scatter', (data) => ({
			data: data.rows,
			series: [{ type: 'scatter' as const, xKey: 'x', yKey: 'y', yName: 'Points' }],
		})),
		hcContender(
			'Highcharts scatter',
			(data) => ({
				series: [{ type: 'scatter' as const, name: 'Points', data: data.pairs }],
			}),
			(chart, data) => {
				chart.series[0]?.setData(data.pairs, false, false)
			},
		),
	]
}
