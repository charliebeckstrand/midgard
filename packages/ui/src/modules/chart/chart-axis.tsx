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
	/** Which axis to draw. */
	axis: 'x' | 'y'
	plot: PlotRect
	ticks: ChartAxisTick[]
}

/**
 * One chart axis: the x axis draws the baseline with category labels under
 * their bands; the y axis draws right-aligned value labels in the gutter and
 * leaves the line to the gridlines, keeping the chrome recessive.
 *
 * @internal
 */
export function ChartAxis({ axis, plot, ticks }: ChartAxisProps) {
	if (axis === 'y') {
		return (
			<g data-slot="chart-axis-y">
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

	const baseline = plot.y + plot.height

	return (
		<g data-slot="chart-axis-x">
			<line
				x1={plot.x}
				y1={baseline}
				x2={plot.x + plot.width}
				y2={baseline}
				strokeWidth={1}
				shapeRendering="crispEdges"
				className={cn(k.axis)}
			/>

			{ticks.map((tick) => (
				<text
					key={tick.at}
					x={tick.at}
					y={baseline + GUTTER_GAP}
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
