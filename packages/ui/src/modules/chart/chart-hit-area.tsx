'use client'

import type { PlotRect } from './chart-layout'
import type { BandScale } from './chart-scale'
import { useChartPointer } from './use-chart-pointer'

/** Props for {@link ChartHitArea}. @internal */
export type ChartHitAreaProps = {
	plot: PlotRect
	band: BandScale
	count: number
}

/**
 * The transparent rectangle over the plot that feeds the hover context:
 * the whole band is the hit target, so readers aim at a category, never at
 * a 2px mark. Rendered inside the frame, after the marks, so it wins the
 * pointer without occluding anything.
 *
 * @internal
 */
export function ChartHitArea({ plot, band, count }: ChartHitAreaProps) {
	const handlers = useChartPointer(band, count, plot)

	return (
		<rect
			data-slot="chart-hit"
			x={plot.x}
			y={plot.y}
			width={plot.width}
			height={plot.height}
			fill="none"
			pointerEvents="all"
			{...handlers}
		/>
	)
}
