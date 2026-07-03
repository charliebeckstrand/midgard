'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { PlotRect } from './chart-layout'
import { useChartHover } from './context'

/** Props for {@link ChartValueLine}. @internal */
export type ChartValueLineProps = {
	plot: PlotRect
}

/**
 * The horizontal dashed rule tracking the pointer's height across a bar
 * chart's plot, so a reader can carry a bar's top over to the value axis and
 * across to its neighbours. Shown only while a band is hovered, clamped to the
 * plot rect; reads only the hover context, so it re-renders alone — never the
 * marks. The value axis is continuous, so the rule follows the pointer rather
 * than snapping like the categorical crosshair.
 *
 * @internal
 */
export function ChartValueLine({ plot }: ChartValueLineProps) {
	const { index, point } = useChartHover()

	if (index === null || point === null) return null

	const y = Math.min(plot.y + plot.height, Math.max(plot.y, point.y))

	return (
		<line
			data-slot="chart-value-line"
			x1={plot.x}
			y1={y}
			x2={plot.x + plot.width}
			y2={y}
			strokeWidth={1}
			strokeDasharray="4 4"
			shapeRendering="crispEdges"
			className={cn(k.axis)}
		/>
	)
}
