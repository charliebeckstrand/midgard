'use client'

import { type ReactNode, type RefObject, useMemo, useState } from 'react'
import { AspectRatio } from '../../components/aspect-ratio'
import { cn } from '../../core'
import type { AccessibleName } from '../../types'
import type { PlotRect } from './chart-layout'
import { ChartTable } from './chart-table'
import { ChartTooltip } from './chart-tooltip'
import { type ChartHover, ChartHoverContext, type ChartPoint } from './context'
import type { ChartReadout } from './types'

/** Props for {@link ChartFrame}; the accessible name spreads onto the `role="img"` plot region. @internal */
export type ChartFrameProps = AccessibleName & {
	/** Wrapper ref from `useChartPlot`, attached for container measurement. */
	ref: RefObject<HTMLDivElement | null>
	/** Resolved drawing width; `0` renders the frame shell without the SVG. */
	width: number
	/** Explicit width prop, fixing the wrapper instead of filling the container. */
	fixedWidth?: number
	height: number
	/**
	 * The `width / height` ratio to reserve the plot box height through CSS, or
	 * `null` to use the pixel `height`. CSS reservation keeps the height stable
	 * before the width is measured and across animation replays.
	 */
	reserveAspect: number | null
	/** The plot rectangle inside the frame; the tooltip flips sides at its midpoint. */
	plot: PlotRect
	/** The prepared legend row, or `null` to omit it (single series). */
	legend: ReactNode
	/** The values behind the marks, or `null` when there is nothing to read. */
	readout: ChartReadout | null
	/** Mount the hover tooltip. */
	tooltip: boolean
	className?: string
	/** HTML layered over the SVG inside the plot region — a donut's center content. */
	overlay?: ReactNode
	/** The SVG content: axes, gridlines, marks, and the hit layer. */
	children: ReactNode
}

/**
 * The shared chart shell: legend and visually-hidden data table as plain
 * HTML around a `role="img"` plot region holding the `aria-hidden` SVG and
 * the tooltip overlay. Owns the hover index and provides it through
 * `ChartHoverContext`, so pointer movement re-renders the overlays — never
 * the marks.
 *
 * @internal
 */
export function ChartFrame({
	ref,
	width,
	fixedWidth,
	height,
	reserveAspect,
	plot,
	legend,
	readout,
	tooltip,
	className,
	overlay,
	children,
	...label
}: ChartFrameProps) {
	const [pointed, setPointed] = useState<{ index: number | null; point: ChartPoint | null }>({
		index: null,
		point: null,
	})

	const hover = useMemo<ChartHover>(
		() => ({
			...pointed,
			set: (index, point) => setPointed({ index, point }),
		}),
		[pointed],
	)

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size.
	const svg = width > 0 && (
		<svg aria-hidden="true" className="block size-full" viewBox={`0 0 ${width} ${height}`}>
			{children}
		</svg>
	)

	return (
		<div
			ref={ref}
			data-slot="chart"
			className={cn('block', fixedWidth === undefined && 'w-full', className)}
			style={fixedWidth === undefined ? undefined : { width: fixedWidth }}
		>
			<ChartHoverContext value={hover}>
				{legend}

				<div data-slot="chart-plot" role="img" {...label} className="relative">
					{/* AspectRatio reserves the box height from its own width — steady
					    before the width is measured and across animation replays — while
					    an explicit height sets a fixed box. The tooltip sits outside so
					    the aspect box's clip never touches it. */}
					{reserveAspect === null ? (
						<div style={{ height }}>{svg}</div>
					) : (
						<AspectRatio ratio={reserveAspect}>{svg}</AspectRatio>
					)}

					{overlay}

					{tooltip && readout && width > 0 && <ChartTooltip plot={plot} readout={readout} />}
				</div>
			</ChartHoverContext>

			{readout && <ChartTable readout={readout} />}
		</div>
	)
}
