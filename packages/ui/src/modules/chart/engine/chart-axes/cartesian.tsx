import type { CartesianChart } from '../use-chart-cartesian'
import { ChartAxis, ChartAxisTitles } from './axis'
import { ChartGridLines } from './grid-lines'

/** Props for {@link ChartCartesianAxes}. @internal */
export type ChartCartesianAxesProps = {
	/**
	 * The resolved chart the part reads its orientation, plot, ticks, scales,
	 * gridlines, dividers, titles, and category rule off — the shape
	 * {@link ChartCartesianFrame} already takes.
	 */
	chart: CartesianChart
}

/**
 * The oriented chrome behind a cartesian chart's marks: value gridlines, the
 * value axes, and the category axis. Each is wired to the side the orientation
 * puts it on. Vertical keeps the primary value axis on the left (no line) and
 * categories on the bottom (with the zero baseline). Horizontal transposes
 * them: value labels on the bottom without a line, categories down the left
 * with the baseline as a vertical rule. A resolved secondary scale adds the far
 * side's axis — right when vertical, top when horizontal — and any titles draw
 * in the bands the layout reserved. The transpose lives here so a chart drops
 * in one part instead of branching its own render tree.
 *
 * @internal
 */
export function ChartCartesianAxes({ chart }: ChartCartesianAxesProps) {
	const {
		orientation,
		plot,
		yTicks: valueTicks,
		y2Ticks,
		xTicks: categoryTicks,
		yScale,
		y2Scale,
		bandPositions,
		axes,
		gridPositions,
		categoryGridPositions,
		categorySeparator,
		categoryBaseline,
		axisTitles,
	} = chart

	const vertical = orientation === 'vertical'

	return (
		<>
			{gridPositions.length > 0 && (
				<ChartGridLines plot={plot} ticks={gridPositions} orientation={orientation} />
			)}

			{/* Dividers run parallel to the value axis, so they take the transposed
			    orientation — a vertical chart rules them down its band boundaries. */}
			{categoryGridPositions.length > 0 && (
				<ChartGridLines
					plot={plot}
					ticks={categoryGridPositions}
					orientation={vertical ? 'horizontal' : 'vertical'}
					dashed={categorySeparator === 'dashed'}
				/>
			)}

			{axes && yScale !== null && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					plot={plot}
					ticks={valueTicks}
					line={vertical ? undefined : false}
				/>
			)}

			{axes && y2Scale !== null && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					position={vertical ? 'right' : 'top'}
					plot={plot}
					ticks={y2Ticks}
				/>
			)}

			{axes && bandPositions.length > 0 && (
				<ChartAxis
					axis={vertical ? 'x' : 'y'}
					plot={plot}
					ticks={categoryTicks}
					baseline={categoryBaseline}
				/>
			)}

			{axes && <ChartAxisTitles titles={axisTitles} />}
		</>
	)
}
