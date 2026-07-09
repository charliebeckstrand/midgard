'use client'

import { useCallback } from 'react'
import { cn } from '../../core'
import type { PlotRect } from './chart-layout'
import { bandCoord, type ChartOrientation } from './chart-orientation'
import { type BandScale, nearestBandIndex } from './chart-scale'
import type { ChartTooltipTrigger } from './chart-schema'
import { type ChartMarkRef, useChartTier } from './context'
import { useChartPointer } from './use-chart-pointer'

/** Props for {@link ChartHitArea}. @internal */
export type ChartHitAreaProps = {
	plot: PlotRect
	band: BandScale
	count: number
	/**
	 * The chart's mark hit test: the mark under the point — a bar, a line — that
	 * isolation lifts and every other mark recedes behind, or `null` off the marks,
	 * which is also where the tooltip stays shut. `held` carries the mark currently
	 * emphasised, so a bounded catch can stay sticky across the midline between two
	 * overlapping catches; `index` carries the resolved category, so a snapping
	 * chart can hand the emphasis to the stop the tooltip anchors in that column.
	 */
	markAt?: (
		x: number,
		y: number,
		held: ChartMarkRef | null,
		index: number | null,
	) => ChartMarkRef | null
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
	/**
	 * Reports a click that resolves to a category band, by data index — the
	 * plumbing behind the charts' public `onCategoryClick`. Also carries a
	 * pointer cursor across the plot so the bands read as clickable.
	 */
	onIndexClick?: (index: number) => void
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
	markAt,
	orientation = 'vertical',
	trigger = 'hover',
	snaps = false,
	onIndexClick,
}: ChartHitAreaProps) {
	// The band runs across x when vertical, down y when horizontal, so the index
	// reads whichever coordinate the orientation puts the band on.
	const resolveIndex = useCallback(
		(x: number, y: number) => nearestBandIndex(bandCoord(orientation, { x, y }), band, count),
		[band, count, orientation],
	)

	const { ref, ...handlers } = useChartPointer(
		plot,
		resolveIndex,
		undefined,
		trigger,
		snaps,
		onIndexClick,
		markAt,
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
			className={cn(((trigger === 'click' && snaps) || onIndexClick) && 'cursor-pointer')}
			{...handlers}
		/>
	)
}
