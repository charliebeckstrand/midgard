'use client'

import { useCallback } from 'react'
import { cn } from '../../core'
import type { PlotRect } from './chart-layout'
import { bandCoord, type ChartOrientation } from './chart-orientation'
import { type BandScale, nearestBandIndex } from './chart-scale'
import type { ChartTooltipTrigger } from './chart-schema'
import { useChartTier } from './context'
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
	 * — which also points the cursor at the marks a click can read.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Whether the readout snaps to the nearest point, so it reads off the marks
	 * too. Lets a `'click'` off the marks pin the snapped band rather than dismiss,
	 * and carries the pointer cursor across the whole plot rather than the marks alone.
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
 * Self-gating at spark through {@link ChartTierContext}: a sparkline is
 * read-only, so no hit rect — nor the pointer plumbing behind it — mounts,
 * and the crosshair and tooltip that ride its hover can never draw. A chart
 * mounts it whenever a tooltip or crosshair wants the pointer and leaves the
 * tier to the frame.
 *
 * @internal
 */
export function ChartHitArea(props: ChartHitAreaProps) {
	const spark = useChartTier() === 'spark'

	return spark ? null : <ChartHitRect {...props} />
}

/** The live hit rect behind {@link ChartHitArea}, mounted only off spark. @internal */
function ChartHitRect({
	plot,
	band,
	count,
	onData,
	orientation = 'vertical',
	trigger = 'hover',
	snaps = false,
}: ChartHitAreaProps) {
	// The band runs across x when vertical, down y when horizontal, so the index
	// reads whichever coordinate the orientation puts the band on.
	const resolveIndex = useCallback(
		(x: number, y: number) => nearestBandIndex(bandCoord(orientation, { x, y }), band, count),
		[band, count, orientation],
	)

	const { ref, ...handlers } = useChartPointer(plot, resolveIndex, onData, trigger, snaps)

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
