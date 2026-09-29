import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/chart'
import { type ChartOrientation, type PlotRect, valueRule } from '../chart-orientation'

/** Props for {@link ChartGridLines}. @internal */
export type ChartGridLinesProps = {
	plot: PlotRect
	/** The value-axis position of each hairline, in `viewBox` units. */
	ticks: number[]
	/**
	 * Which way the value axis runs — vertical draws horizontal lines, horizontal
	 * draws vertical ones.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * Dash the lines — the category dividers ruled between bands, set apart from
	 * the solid value gridlines.
	 * @defaultValue false
	 */
	dashed?: boolean
}

/**
 * Hairline gridlines at the value ticks, drawn across the band axis — solid,
 * one step off the surface, recessive under the marks. They run perpendicular
 * to the value axis, so a vertical chart rules horizontal lines and a
 * horizontal one rules vertical lines.
 *
 * @internal
 */
export function ChartGridLines({
	plot,
	ticks,
	orientation = 'vertical',
	dashed = false,
}: ChartGridLinesProps) {
	return (
		<g data-slot="chart-grid-lines">
			{ticks.map((tick) => {
				const { from, to } = valueRule(orientation, plot, tick)

				return (
					<line
						key={tick}
						x1={from.x}
						y1={from.y}
						x2={to.x}
						y2={to.y}
						strokeWidth={1}
						strokeDasharray={dashed ? '3 3' : undefined}
						shapeRendering="crispEdges"
						className={cn(k.grid)}
					/>
				)
			})}
		</g>
	)
}
