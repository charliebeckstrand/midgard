import type { CartesianChart } from '../use-chart-cartesian'
import { ChartAxis, ChartAxisTitles } from './axis'
import { ChartGridLines } from './grid-lines'

/** Props for {@link ChartCartesianAxes}. @internal */
export type ChartCartesianAxesProps = {
	/**
	 * The resolved chart the part reads its orientation, plot, ticks, scales,
	 * gridlines, dividers, and titles off — the shape {@link ChartCartesianFrame}
	 * already takes.
	 */
	chart: CartesianChart
	/**
	 * The zero line's position along the value axis, ruling the category axis;
	 * omitted draws none. The one field that stays a prop: `CartesianChart.baseline`
	 * is `scale.map(0)`, which a line chart extrapolates off the plot and an area
	 * chart lifts off the floor on negative data, so bar and combo opt in and the
	 * other two leave the rule to the plot edge.
	 */
	baseline?: number
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
export function ChartCartesianAxes({ chart, baseline }: ChartCartesianAxesProps) {
	const {
		orientation,
		plot,
		yTicks: valueTicks,
		y2Ticks,
		xTicks: categoryTicks,
		axes,
		gridPositions,
		categoryGridPositions,
		categorySeparator,
		axisTitles: titles,
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

			{axes && chart.yScale !== null && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					plot={plot}
					ticks={valueTicks}
					line={vertical ? undefined : false}
				/>
			)}

			{axes && chart.y2Scale !== null && (
				<ChartAxis
					axis={vertical ? 'y' : 'x'}
					position={vertical ? 'right' : 'top'}
					plot={plot}
					ticks={y2Ticks}
				/>
			)}

			{axes && chart.bandPositions.length > 0 && (
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
