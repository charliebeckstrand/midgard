'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { PlotRect } from './chart-layout'
import { useChartHover } from './context'

/** Props for {@link ChartCrosshair}. @internal */
export type ChartCrosshairProps = {
	plot: PlotRect
	/** The snapped crosshair x per category index — the band centers. */
	xs: number[]
}

/**
 * The vertical dashed guide tracking the hovered category — the `y` line of a
 * chart's `guideLine`. Snapped to the band center so readers aim at a category,
 * never at a 2px mark, and dashed to match the horizontal `x` guide. Reads only
 * the hover context, so it re-renders alone.
 *
 * @internal
 */
export function ChartCrosshair({ plot, xs }: ChartCrosshairProps) {
	const { index } = useChartHover()

	const x = index === null ? undefined : xs[index]

	if (x === undefined) return null

	return (
		<line
			data-slot="chart-crosshair"
			x1={x}
			y1={plot.y}
			x2={x}
			y2={plot.y + plot.height}
			strokeWidth={1}
			strokeDasharray="4 4"
			shapeRendering="crispEdges"
			className={cn(k.axis)}
		/>
	)
}
