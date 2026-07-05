'use client'

import { type ReactNode, type RefObject, useMemo, useState } from 'react'
import { cn } from '../../core'
import type { FrameReserve } from '../../hooks'
import { k } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'
import type { ChartOrientation } from './chart-orientation'
import { ChartPlotBox } from './chart-plot-box'
import type { ChartLegendPlacement } from './chart-schema'
import type { ChartSnap } from './chart-snap'
import { ChartTable } from './chart-table'
import { ChartTooltip } from './chart-tooltip'
import {
	type ChartEmphasis,
	ChartEmphasisContext,
	type ChartHover,
	ChartHoverContext,
	type ChartPoint,
} from './context'
import type { ChartReadout } from './types'
import {
	type ChartFocusTargets,
	type ChartKeyboardProps,
	useChartKeyboard,
} from './use-chart-keyboard'

/** Whether two hover points coincide, so a redundant hover write can bail. @internal */
function samePoint(a: ChartPoint | null, b: ChartPoint | null): boolean {
	return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

/**
 * The plot region's attributes: the keyboard tab stop and its focus ring when
 * `keyboard` makes the region navigable, else a plain non-focusable region.
 *
 * @internal
 */
function plotRegionProps(keyboard: ChartKeyboardProps | null, aside: boolean) {
	return {
		...keyboard,
		className: cn('relative rounded-sm', keyboard && k.focusRing, aside && 'min-w-0 flex-1'),
	}
}

/** Props for {@link ChartFrame}; the accessible name spreads onto the `role="img"` plot region. @internal */
export type ChartFrameProps = AccessibleName & {
	/**
	 * Measuring ref from `usePlotFrame`, attached to the plot region — the box
	 * the drawing actually fills, so a side legend never inflates the width.
	 */
	ref: RefObject<HTMLDivElement | null>
	/** Resolved drawing width; `0` renders the frame shell without the SVG. */
	width: number
	/** Explicit width prop, fixing the wrapper instead of filling the container. */
	fixedWidth?: number
	height: number
	/**
	 * How the plot box reserves its height from its own width through CSS, or
	 * `null` to use the pixel `height`. CSS reservation keeps the height stable
	 * before the width is measured and across animation replays.
	 */
	reserve: FrameReserve | null
	/** The prepared legend row, or `null` to omit it (single series). */
	legend: ReactNode
	/**
	 * Where the legend sits: a centered row under or above the plot, or a
	 * static panel beside it — side by side from `lg`, always under the chart
	 * below it.
	 * @defaultValue 'bottom'
	 */
	legendPlacement?: ChartLegendPlacement
	/** The values behind the marks, or `null` when there is nothing to read. */
	readout: ChartReadout | null
	/** Mount the hover tooltip. */
	tooltip: boolean
	/** Snap targets when the crosshair snaps, carrying the tooltip to the intersection. */
	snap?: ChartSnap
	/**
	 * Band centers and value points that make the plot a keyboard tab stop: the
	 * arrow keys walk them through the same hover the pointer drives. Omitted on
	 * charts that don't navigate by category (pie / donut), leaving the region a
	 * plain `role="img"`.
	 */
	focus?: ChartFocusTargets
	/**
	 * Which way a cartesian chart faces, so the snapped tooltip anchor transposes.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	className?: string
	/** HTML layered over the SVG inside the plot region — a donut's center content. */
	overlay?: ReactNode
	/** Visually-hidden HTML beside the data table — reference-line parity outside the plot. */
	annotations?: ReactNode
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
	reserve,
	legend,
	legendPlacement = 'bottom',
	readout,
	tooltip,
	snap,
	focus,
	orientation,
	className,
	overlay,
	annotations,
	children,
	...label
}: ChartFrameProps) {
	const [pointed, setPointed] = useState<{
		index: number | null
		point: ChartPoint | null
		onData: boolean
	}>({ index: null, point: null, onData: false })

	const hover = useMemo<ChartHover>(
		() => ({
			...pointed,
			// Bail on a no-op so a scroll's repeated clears — one per frame — cost a
			// single render, and page scrolls far from this chart cost none.
			set: (index, point, onData = true) =>
				setPointed((prev) =>
					prev.index === index && prev.onData === onData && samePoint(prev.point, point)
						? prev
						: { index, point, onData },
				),
		}),
		[pointed],
	)

	// Arrow-key navigation over the value points, driving the same hover the
	// pointer does — a tab stop only where a readout can answer it.
	const keyboard = useChartKeyboard(
		focus,
		orientation ?? 'vertical',
		tooltip && readout !== null,
		hover.set,
	)

	const [referenceActive, setReferenceActive] = useState(false)

	const emphasis = useMemo<ChartEmphasis>(
		() => ({ referenceActive, setReferenceActive }),
		[referenceActive],
	)

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size.
	const svg = width > 0 && (
		<svg aria-hidden="true" className="block size-full" viewBox={`0 0 ${width} ${height}`}>
			{children}
		</svg>
	)

	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	const plotRegion = (
		<div
			ref={ref}
			data-slot="chart-plot"
			role="img"
			{...label}
			{...plotRegionProps(keyboard, aside)}
		>
			{/* ChartPlotBox reserves the box height from its own width — steady before
			    the width is measured and across animation replays — or takes a fixed
			    pixel height. The tooltip sits outside so its clip never touches it. */}
			<ChartPlotBox reserve={reserve} height={height}>
				{svg}
			</ChartPlotBox>

			{overlay}

			{tooltip && readout && width > 0 && (
				<ChartTooltip plotRef={ref} readout={readout} snap={snap} orientation={orientation} />
			)}
		</div>
	)

	return (
		<div
			data-slot="chart"
			className={cn('flex flex-col gap-3', fixedWidth === undefined && 'w-full', className)}
			style={fixedWidth === undefined ? undefined : { width: fixedWidth }}
		>
			<ChartEmphasisContext value={emphasis}>
				<ChartHoverContext value={hover}>
					{aside ? (
						// The panel and plot sit side by side from lg; below it they stack
						// with the panel always under the chart, so a left panel reverses
						// the row instead of moving in the DOM.
						<div
							className={cn(
								'flex flex-col gap-2 lg:items-center',
								legendPlacement === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row',
							)}
						>
							{plotRegion}

							{legend}
						</div>
					) : (
						<>
							{legendPlacement === 'top' && legend}

							{plotRegion}

							{legendPlacement === 'bottom' && legend}
						</>
					)}
				</ChartHoverContext>
			</ChartEmphasisContext>

			{readout && <ChartTable readout={readout} />}

			{annotations}
		</div>
	)
}
