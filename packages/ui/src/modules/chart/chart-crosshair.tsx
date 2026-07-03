'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { PlotRect } from './chart-layout'
import { useChartHover } from './context'
import type { Crosshair } from './types'

/** Props for {@link ChartCrosshair}. @internal */
export type ChartCrosshairProps = {
	plot: PlotRect
	/** Which rules to draw and whether they snap. */
	crosshair: Crosshair
	/** Band-center x per category — the vertical rule's snap target. */
	bandXs: number[]
	/** Per category, the visible series' plot y — the horizontal rule's snap targets. */
	snapPoints: number[][]
}

/** The plot-y among `candidates` nearest to `value`, or `null` when the category has none. @internal */
function nearestValue(candidates: number[] | undefined, value: number): number | null {
	if (!candidates || candidates.length === 0) return null

	return candidates.reduce((best, y) => (Math.abs(y - value) < Math.abs(best - value) ? y : best))
}

/**
 * The hover crosshair: a horizontal `x` rule across the value axis and a
 * vertical `y` rule down the category axis, each opt-in. Without `snap` a rule
 * tracks the pointer exactly; with it the pair meets the nearest data point —
 * the horizontal at that point's value, the vertical at its band center. Both
 * clamp to the plot rect and dash alike. Reads only the hover context, so it
 * re-renders alone — never the marks.
 *
 * @internal
 */
export function ChartCrosshair({ plot, crosshair, bandXs, snapPoints }: ChartCrosshairProps) {
	const { index, point } = useChartHover()

	if (index === null || point === null) return null

	const rule = {
		strokeWidth: 1,
		strokeDasharray: '4 4',
		shapeRendering: 'crispEdges' as const,
		className: cn(k.axis),
	}

	const rawY = crosshair.snap ? nearestValue(snapPoints[index], point.y) : point.y

	const rawX = crosshair.snap ? bandXs[index] : point.x

	const y = rawY === null ? null : Math.min(plot.y + plot.height, Math.max(plot.y, rawY))

	const x = rawX === undefined ? null : Math.min(plot.x + plot.width, Math.max(plot.x, rawX))

	return (
		<g data-slot="chart-crosshair">
			{crosshair.x && y !== null && (
				<line
					data-slot="chart-crosshair-x"
					x1={plot.x}
					y1={y}
					x2={plot.x + plot.width}
					y2={y}
					{...rule}
				/>
			)}

			{crosshair.y && x !== null && (
				<line
					data-slot="chart-crosshair-y"
					x1={x}
					y1={plot.y}
					x2={x}
					y2={plot.y + plot.height}
					{...rule}
				/>
			)}
		</g>
	)
}
