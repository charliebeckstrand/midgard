'use client'

import { cn } from '../../../core'
import type { PlotRect } from '../chart-layout'
import type { ChartTooltipTrigger } from '../chart-schema'
import { useChartPointer } from '../use-chart-pointer'
import { nearestCenterIndex } from './scatter-chart-geometry'

/** Props for {@link ScatterChartHitArea}. @internal */
export type ScatterChartHitAreaProps = {
	plot: PlotRect
	/** The unique x values' screen positions — the hover index snaps to the nearest. */
	centers: number[]
	/** The chart's point hit test; the tooltip shows only where it holds. */
	onData?: (x: number, y: number) => boolean
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which also points the cursor at the points a click can read.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Whether the readout snaps to the nearest point, so it reads off the marks
	 * too. Lets a `'click'` off the points pin the snapped column rather than
	 * dismiss, and carries the pointer cursor across the whole plot rather than the
	 * points alone.
	 * @defaultValue false
	 */
	snaps?: boolean
}

/**
 * The scatter counterpart of the band charts' hit layer: a transparent
 * rectangle over the plot feeding the shared hover context, the index resolved
 * to the nearest unique-x column rather than an evenly spaced band — unique x
 * values arrive at whatever spacing the data has. It shares the band layer's
 * {@link useChartPointer} path — the scroll rescue, the click-to-pin trigger,
 * and the cursor reflection all ride along — varying only the column resolver.
 *
 * @internal
 */
export function ScatterChartHitArea({
	plot,
	centers,
	onData,
	trigger = 'hover',
	snaps = false,
}: ScatterChartHitAreaProps) {
	// The index snaps to the nearest unique-x column; y never narrows it, so the
	// resolver reads x alone.
	const { ref, ...handlers } = useChartPointer(
		(x) => nearestCenterIndex(x, centers),
		plot,
		onData,
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
			className={cn(trigger === 'click' && snaps && 'cursor-pointer')}
			{...handlers}
		/>
	)
}
