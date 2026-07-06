import { ChartAxis, type ChartAxisTick, ChartAxisTitles } from './chart-axis'
import { ChartGridLines } from './chart-grid-lines'
import type { ChartAxisTitlePlacement, PlotRect } from './chart-layout'
import type { ChartOrientation } from './chart-orientation'

/** Props for {@link ChartCartesianAxes}. @internal */
export type ChartCartesianAxesProps = {
	orientation: ChartOrientation
	plot: PlotRect
	/** Primary value ticks along the value axis; empty when no scale resolved. */
	valueTicks: ChartAxisTick[]
	/** Whether the primary value scale resolved — an empty domain draws no value axis. */
	hasScale: boolean
	/** Secondary value ticks along the far side; empty without a right scale. */
	rightTicks?: ChartAxisTick[]
	/** Whether the secondary scale resolved — it draws on the right (vertical) or top (horizontal). */
	hasRightScale?: boolean
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
	/**
	 * The gridline positions, per-axis participation already applied; defaults
	 * to the primary ticks so a single-axis chart passes nothing extra.
	 */
	gridPositions?: number[]
	/** The value-axis titles the layout placed; empty draws none. */
	titles?: ChartAxisTitlePlacement[]
}

/**
 * The oriented chrome behind a cartesian chart's marks: value gridlines, the
 * value axes, and the category axis, each wired to the side the orientation
 * puts it on. Vertical keeps the primary value axis on the left (no line) and
 * categories on the bottom (with the zero baseline); horizontal transposes
 * them — value labels on the bottom without a line, categories down the left
 * with the baseline as a vertical rule. A resolved secondary scale adds the far
 * side's axis — right when vertical, top when horizontal — and any titles draw
 * in the bands the layout reserved. The transpose lives here so a chart drops
 * in one part instead of branching its own render tree.
 *
 * @internal
 */
export function ChartCartesianAxes({
	orientation,
	plot,
	valueTicks,
	hasScale,
	rightTicks = [],
	hasRightScale = false,
	categoryTicks,
	hasData,
	baseline,
	axes,
	gridLines,
	gridPositions,
	titles = [],
}: ChartCartesianAxesProps) {
	const vertical = orientation === 'vertical'

	const positions = gridPositions ?? valueTicks.map((tick) => tick.at)

	return (
		<>
			{gridLines && positions.length > 0 && (
				<ChartGridLines plot={plot} ticks={positions} orientation={orientation} />
			)}

			{axes && hasScale && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					plot={plot}
					ticks={valueTicks}
					line={vertical ? undefined : false}
				/>
			)}

			{axes && hasRightScale && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					position={vertical ? 'right' : 'top'}
					plot={plot}
					ticks={rightTicks}
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

			{axes && <ChartAxisTitles titles={titles} />}
		</>
	)
}
