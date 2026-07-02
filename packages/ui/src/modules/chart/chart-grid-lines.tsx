import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { PlotRect } from './chart-layout'

/** Props for {@link ChartGridLines}. @internal */
export type ChartGridLinesProps = {
	plot: PlotRect
	/** The y of each horizontal hairline, in `viewBox` units. */
	ys: number[]
}

/**
 * Horizontal hairline gridlines at the value ticks — solid, one step off the
 * surface, recessive under the marks.
 *
 * @internal
 */
export function ChartGridLines({ plot, ys }: ChartGridLinesProps) {
	return (
		<g data-slot="chart-grid-lines">
			{ys.map((y) => (
				<line
					key={y}
					x1={plot.x}
					y1={y}
					x2={plot.x + plot.width}
					y2={y}
					strokeWidth={1}
					shapeRendering="crispEdges"
					className={cn(k.grid)}
				/>
			))}
		</g>
	)
}
