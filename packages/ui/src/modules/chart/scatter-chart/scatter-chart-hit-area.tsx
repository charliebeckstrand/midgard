'use client'

import { useCallback } from 'react'
import { cn } from '../../../core'
import type { PlotRect } from '../engine/chart-layout'
import { nearestStopIndex } from '../engine/chart-snap'
import type { ChartTooltipTrigger } from '../engine/chart-tooltip'
import type { ChartMarkRef } from '../engine/context'
import { useChartPointer } from '../engine/use-chart-pointer'

/** Props for {@link ScatterChartHitArea}. @internal */
export type ScatterChartHitAreaProps = {
	plot: PlotRect
	/** The unique x values' screen positions — the hover index snaps to the nearest. */
	centers: number[]
	/**
	 * The chart's point hit test: the disc under the point that isolation lifts and
	 * the others recede behind. It is `null` off every disc, where the tooltip
	 * stays shut. `held` carries the disc currently emphasized, for sticky
	 * resolution within overlapping discs. The `index` carries the resolved
	 * column, so a snapping chart can hand the emphasis to the stop the tooltip
	 * anchors there.
	 */
	markAt?: (
		x: number,
		y: number,
		held: ChartMarkRef | null,
		index: number | null,
	) => ChartMarkRef | null
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which also points the cursor at the points a click can read.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Whether the readout snaps to the nearest point, so it reads off the marks
	 * too. Lets a `'click'` off the points pin the snapped column rather than
	 * dismiss. It also carries the pointer cursor across the whole plot, rather
	 * than the points alone.
	 * @defaultValue false
	 */
	snaps?: boolean
	/** The consumer's point-click report, resolved through the same hit test the isolation uses. */
	onMarkClick?: (mark: ChartMarkRef) => void
}

/**
 * The scatter counterpart of the band charts' hit layer. It shares the same
 * {@link useChartPointer} hover, scroll rescue, and click-to-pin behavior. It
 * resolves the index to the nearest unique-x column, rather than an evenly
 * spaced band. Unique x values arrive at whatever spacing the data has.
 *
 * @internal
 */
export function ScatterChartHitArea({
	plot,
	centers,
	markAt,
	trigger = 'hover',
	snaps = false,
	onMarkClick,
}: ScatterChartHitAreaProps) {
	// The nearest unique-x column stands in for the band charts' evenly spaced band.
	const resolveIndex = useCallback((x: number) => nearestStopIndex(centers, x), [centers])

	const { ref, ...handlers } = useChartPointer(
		plot,
		resolveIndex,
		undefined,
		trigger,
		snaps,
		undefined,
		markAt,
		onMarkClick,
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
			className={cn((onMarkClick || (trigger === 'click' && snaps)) && 'cursor-pointer')}
			{...handlers}
		/>
	)
}
