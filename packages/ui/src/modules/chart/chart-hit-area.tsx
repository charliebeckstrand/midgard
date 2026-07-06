'use client'

import { cn } from '../../core'
import type { PlotRect } from './chart-layout'
import type { ChartOrientation } from './chart-orientation'
import type { BandScale } from './chart-scale'
import type { ChartTooltipTrigger } from './chart-schema'
import { useChartPointer } from './use-chart-pointer'

/** Props for {@link ChartHitArea}. @internal */
export type ChartHitAreaProps = {
	plot: PlotRect
	band: BandScale
	count: number
	/** The chart's mark hit test; the tooltip shows only where it holds. */
	onData?: (x: number, y: number) => boolean
	/**
	 * Which axis the band runs along, so the pointer resolves the right coordinate.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which also gives the layer a pointer cursor to read as clickable.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Whether the readout snaps to the nearest point, so it reads off the marks
	 * too. Lets a `'click'` off the marks pin the snapped band rather than dismiss.
	 * @defaultValue false
	 */
	snaps?: boolean
}

/**
 * The transparent rectangle over the plot that feeds the hover context:
 * the whole band is the hit target, so readers aim at a category, never at
 * a 2px mark. Rendered inside the frame, after the marks, so it wins the
 * pointer without occluding anything.
 *
 * @internal
 */
export function ChartHitArea({
	plot,
	band,
	count,
	onData,
	orientation,
	trigger = 'hover',
	snaps = false,
}: ChartHitAreaProps) {
	const { ref, ...handlers } = useChartPointer(
		band,
		count,
		plot,
		onData,
		orientation,
		trigger,
		snaps,
	)

	return (
		<rect
			ref={ref}
			data-slot="chart-hit"
			x={plot.x}
			y={plot.y}
			width={plot.width}
			height={plot.height}
			fill="none"
			pointerEvents="all"
			className={cn(trigger === 'click' && 'cursor-pointer')}
			{...handlers}
		/>
	)
}
