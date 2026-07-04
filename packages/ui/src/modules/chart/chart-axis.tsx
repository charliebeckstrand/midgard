import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { GUTTER_GAP } from './chart-constants'
import type { PlotRect } from './chart-layout'

/** One rendered tick: its position along the axis and its label. @internal */
export type ChartAxisTick = {
	/** Position in `viewBox` units: an x for the x axis, a y for the y axis. */
	at: number
	label: string
}

/** Props for {@link ChartAxis}. @internal */
export type ChartAxisProps = {
	/** Which side to draw: `x` the bottom axis, `y` the left axis. */
	axis: 'x' | 'y'
	plot: PlotRect
	ticks: ChartAxisTick[]
	/**
	 * The axis line's position along the cross axis — the zero line once negative
	 * values pull it off the plot edge. The x axis reads it as a y (a horizontal
	 * rule) and defaults to the plot floor; the y axis reads it as an x (a
	 * vertical rule, for a horizontal chart's category baseline) and draws no line
	 * without it.
	 */
	baseline?: number
	/**
	 * Draw the x axis's baseline rule. A horizontal chart's value axis sits on the
	 * bottom and, like the vertical chart's left value axis, carries no line —
	 * only the gridlines.
	 * @defaultValue true
	 */
	line?: boolean
}

/**
 * One chart axis: the x axis draws the bottom baseline with labels under their
 * positions; the y axis right-aligns labels in the gutter and draws a line only
 * for a horizontal chart's category baseline, otherwise leaving the rule to the
 * gridlines and keeping the chrome recessive.
 *
 * @internal
 */
export function ChartAxis({ axis, plot, ticks, baseline, line = true }: ChartAxisProps) {
	if (axis === 'y') {
		return (
			<g data-slot="chart-axis-y">
				{baseline !== undefined && (
					<line
						x1={baseline}
						y1={plot.y}
						x2={baseline}
						y2={plot.y + plot.height}
						strokeWidth={1}
						shapeRendering="crispEdges"
						className={cn(k.axis)}
					/>
				)}

				{ticks.map((tick) => (
					<text
						key={tick.at}
						x={plot.x - GUTTER_GAP}
						y={tick.at}
						textAnchor="end"
						dominantBaseline="central"
						className={cn(k.tick)}
					>
						{tick.label}
					</text>
				))}
			</g>
		)
	}

	const floor = plot.y + plot.height

	const lineY = baseline ?? floor

	return (
		<g data-slot="chart-axis-x">
			{line && (
				<line
					x1={plot.x}
					y1={lineY}
					x2={plot.x + plot.width}
					y2={lineY}
					strokeWidth={1}
					shapeRendering="crispEdges"
					className={cn(k.axis)}
				/>
			)}

			{ticks.map((tick) => (
				<text
					key={tick.at}
					x={tick.at}
					y={floor + GUTTER_GAP}
					textAnchor="middle"
					dominantBaseline="hanging"
					className={cn(k.tick)}
				>
					{tick.label}
				</text>
			))}
		</g>
	)
}
