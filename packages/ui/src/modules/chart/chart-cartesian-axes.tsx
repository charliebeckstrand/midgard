import { ChartAxis, type ChartAxisTick } from './chart-axis'
import { ChartGridLines } from './chart-grid-lines'
import type { PlotRect } from './chart-layout'
import type { ChartOrientation } from './chart-orientation'

/** Props for {@link ChartCartesianAxes}. @internal */
export type ChartCartesianAxesProps = {
	orientation: ChartOrientation
	plot: PlotRect
	/** Value ticks along the value axis; empty when no scale resolved. */
	valueTicks: ChartAxisTick[]
	/** Whether a value scale resolved — an empty domain draws neither the value axis nor gridlines. */
	hasScale: boolean
	/** Category labels along the band axis. */
	categoryTicks: ChartAxisTick[]
	/** Whether there are rows to label the category axis. */
	hasData: boolean
	/** The zero line's position along the value axis — the category axis baseline. */
	baseline: number
	/** Draw the axes. */
	axes: boolean
	/** Draw the value gridlines. */
	gridLines: boolean
}

/**
 * The oriented chrome behind a cartesian chart's marks: value gridlines, the
 * value axis, and the category axis, each wired to the side the orientation
 * puts it on. Vertical keeps value on the left (no line) and categories on the
 * bottom (with the zero baseline); horizontal transposes them — value labels
 * on the bottom without a line, categories down the left with the baseline as a
 * vertical rule. The transpose lives here so a chart drops in one part instead
 * of branching its own render tree.
 *
 * @internal
 */
export function ChartCartesianAxes({
	orientation,
	plot,
	valueTicks,
	hasScale,
	categoryTicks,
	hasData,
	baseline,
	axes,
	gridLines,
}: ChartCartesianAxesProps) {
	const vertical = orientation === 'vertical'

	return (
		<>
			{gridLines && hasScale && (
				<ChartGridLines
					plot={plot}
					ticks={valueTicks.map((tick) => tick.at)}
					orientation={orientation}
				/>
			)}

			{axes && hasScale && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					plot={plot}
					ticks={valueTicks}
					line={vertical ? undefined : false}
				/>
			)}

			{axes && hasData && (
				<ChartAxis
					axis={vertical ? 'x' : 'y'}
					plot={plot}
					ticks={categoryTicks}
					baseline={baseline}
				/>
			)}
		</>
	)
}
