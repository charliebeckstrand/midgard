import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { PlotRect } from './chart-layout'
import { bandExtent, type ChartOrientation, project } from './chart-orientation'

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
}

/**
 * Hairline gridlines at the value ticks, drawn across the band axis — solid,
 * one step off the surface, recessive under the marks. They run perpendicular
 * to the value axis, so a vertical chart rules horizontal lines and a
 * horizontal one rules vertical lines.
 *
 * @internal
 */
export function ChartGridLines({ plot, ticks, orientation = 'vertical' }: ChartGridLinesProps) {
	const [from, to] = bandExtent(orientation, plot)

	return (
		<g data-slot="chart-grid-lines">
			{ticks.map((tick) => {
				const start = project(orientation, tick, from)

				const end = project(orientation, tick, to)

				return (
					<line
						key={tick}
						x1={start.x}
						y1={start.y}
						x2={end.x}
						y2={end.y}
						strokeWidth={1}
						shapeRendering="crispEdges"
						className={cn(k.grid)}
					/>
				)
			})}
		</g>
	)
}
