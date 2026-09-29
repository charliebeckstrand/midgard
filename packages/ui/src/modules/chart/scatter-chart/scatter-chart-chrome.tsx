import { ChartAxis, type ChartAxisTick, ChartAxisTitles } from '../engine/chart-axes/axis'
import { ChartGridLines } from '../engine/chart-axes/grid-lines'
import type { ChartAxisTitlePlacement } from '../engine/chart-layout'
import type { PlotRect } from '../engine/chart-orientation'
import type { LinearScale } from '../engine/chart-scale'

/**
 * The scatter frame's chrome: both axes' gridlines, tick labels, and titles.
 * Draws nothing at the spark tier. A sparkline is bare marks, so the labels,
 * gridlines, and titles that would clutter it stand down with the rest of the
 * chrome.
 * @internal
 */
export function ScatterChartChrome(props: {
	plot: PlotRect
	/** Spark strips the chrome entirely — the component renders nothing. */
	spark: boolean
	axes: boolean
	/** Whether each axis's ticks rule the grid — resolved from the axis's own `grid` switch. */
	xGrid: boolean
	yGrid: boolean
	xScale: LinearScale | null
	yScale: LinearScale | null
	xTicks: ChartAxisTick[]
	yTicks: ChartAxisTick[]
	/** The placed axis titles, empty when neither axis is titled. */
	titles: ChartAxisTitlePlacement[]
}) {
	const { plot, spark, axes, xGrid, yGrid, xScale, yScale, xTicks, yTicks, titles } = props

	if (spark) return null

	return (
		<>
			{yGrid && yScale && <ChartGridLines plot={plot} ticks={yTicks.map((tick) => tick.at)} />}

			{xGrid && xScale && (
				<ChartGridLines
					plot={plot}
					ticks={xTicks.map((tick) => tick.at)}
					orientation="horizontal"
				/>
			)}

			{axes && yScale && <ChartAxis axis="y" plot={plot} ticks={yTicks} />}

			{axes && xScale && <ChartAxis axis="x" plot={plot} ticks={xTicks} />}

			{axes && <ChartAxisTitles titles={titles} />}
		</>
	)
}
