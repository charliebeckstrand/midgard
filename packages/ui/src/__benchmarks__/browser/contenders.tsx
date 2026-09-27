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
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import type { PointData, PointRow, TrendData, TrendRow } from './fixtures'

export const WIDTH = 800

export const HEIGHT = 450

/** A mounted chart under bench control. */
export type Mounted<D> = {
	/** Redraws the chart from a replacement dataset of the same shape. */
	update: (data: D) => void | Promise<void>
	destroy: () => void
}

/** One entry in a scenario: a name for the report and a mount. */
export type Contender<D> = {
	name: string
	mount: (host: HTMLElement, data: D) => Mounted<D> | Promise<Mounted<D>>
}

/** Mounts a React tree synchronously and redraws through the same root. */
export function reactContender<D>(name: string, element: (data: D) => ReactElement): Contender<D> {
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
	]
}

/** The ui grouped-bar chart over the same trend shape. */
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
	]
}

/** The ui scatter chart over numeric x/y points. */
export function scatterContenders(): Contender<PointData>[] {
	const series: ScatterChartSeries<PointRow>[] = [{ xKey: 'x', yKey: 'y', yName: 'Points' }]

	return [
		reactContender('ui ScatterChart', (data) => (
			<ScatterChart aria-label="Bench scatter" data={data.rows} series={series} width={WIDTH} />
		)),
	]
}
