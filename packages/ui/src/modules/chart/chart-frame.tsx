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

/** The stable no-op a chart without a series-emphasis channel hands the keyboard. @internal */
function ignoreActiveSeries(_series: number | null): void {}

/**
 * The plot region's attributes: the keyboard tab stop and its focus ring when
 * `keyboard` makes the region navigable, else a plain non-focusable region. It
 * takes the space its siblings leave — `flex-1` along the figure's main axis,
 * shrinkable across it — so a side legend narrows it (`min-w-0`) and a
 * height-driven frame grows it into the room the legend leaves (`min-h-0`).
 *
 * @internal
 */
function plotRegionProps(keyboard: ChartKeyboardProps | null, aside: boolean, fill: boolean) {
	return {
		...keyboard,
		className: cn(
			'relative rounded-sm',
			keyboard && k.focusRing,
			(aside || fill) && 'flex-1',
			aside && 'min-w-0',
			fill && 'min-h-0',
		),
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
	/**
	 * The plot takes the height its region already holds rather than reserving
	 * one — a `flex-1` child grown into the space the legend leaves. Set for the
	 * height-measured frames: a ratio shared with the legend (paired with {@link
	 * ChartFrameProps.aspect}) and the free-form container-filling frame
	 * (`aspectRatio={false}`), so a definite-height parent no longer collapses
	 * the plot to nothing.
	 * @defaultValue false
	 */
	fill?: boolean
	/**
	 * The `width / height` the figure wrapper carries as CSS `aspect-ratio`, so
	 * the whole chart — plot and legend together — holds the ratio and the plot
	 * fills what the legend's natural size leaves. Unset, no wrapper ratio: the
	 * plot box reserves its own (no legend) or the frame is fixed / free-form.
	 */
	aspect?: number
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
	/**
	 * The emphasised series' index, when one is — a legend entry or the keyboard
	 * cursor picking a series. The tooltip dims every other row against it, mirroring
	 * the marks; `null` (the default) reads every row at full strength.
	 */
	emphasis?: number | null
	/** Mount the hover tooltip. */
	tooltip: boolean
	/** Snap targets when the crosshair snaps, carrying the tooltip to the intersection. */
	snap?: ChartSnap
	/**
	 * Per-category anchor points that make the plot a keyboard tab stop: the arrow
	 * keys walk them through the same hover the pointer drives. Absent — or empty —
	 * the region stays a plain non-focusable `role="img"`.
	 */
	focus?: ChartFocusTargets
	/**
	 * Emphasises the series the keyboard cursor lands on (`null` off any), so the
	 * marks recede the rest and the tooltip dims their rows. Pass the chart's
	 * legend-emphasis setter to share one channel with the legend; omitted, keyboard
	 * navigation leaves the emphasis alone — a chart whose stops name no single series.
	 */
	onActiveSeries?: (series: number | null) => void
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
	fill = false,
	aspect,
	legend,
	legendPlacement = 'bottom',
	readout,
	emphasis: seriesEmphasis = null,
	tooltip,
	snap,
	focus,
	onActiveSeries = ignoreActiveSeries,
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

	const [pointerReference, setPointerReference] = useState(false)

	const [activeReference, setActiveReference] = useState<number | null>(null)

	// Arrow-key navigation over the value points and reference lines, driving the
	// same hover the pointer does — a tab stop only where a readout can answer it.
	const keyboard = useChartKeyboard(
		focus,
		orientation ?? 'vertical',
		tooltip && readout !== null,
		hover.set,
		setActiveReference,
		onActiveSeries,
	)

	// The marks recede when either input emphasises a reference: the pointer over a
	// rule, or the keyboard cursor parked on one.
	const emphasis = useMemo<ChartEmphasis>(
		() => ({
			referenceActive: pointerReference || activeReference !== null,
			setReferenceActive: setPointerReference,
			activeReference,
		}),
		[pointerReference, activeReference],
	)

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size.
	const svg = width > 0 && (
		<svg aria-hidden="true" className="block size-full" viewBox={`0 0 ${width} ${height}`}>
			{children}
		</svg>
	)

	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	// A free-form fill frame grabs the container's height itself, since no ratio
	// wrapper supplies it; a ratio-with-legend frame instead leans on the figure's
	// `aspect-ratio` and needs no container height.
	const containerFill = fill && aspect === undefined

	const plotRegion = (
		<div
			ref={ref}
			data-slot="chart-plot"
			role="img"
			{...label}
			{...plotRegionProps(keyboard, aside, fill)}
		>
			{/* ChartPlotBox reserves the box height from its own width — steady before
			    the width is measured and across animation replays — takes a fixed
			    pixel height, or (under `fill`) fills the height its region already
			    holds. The tooltip sits outside so its clip never touches it. */}
			<ChartPlotBox reserve={reserve} height={height} fill={fill}>
				{svg}
			</ChartPlotBox>

			{overlay}

			{tooltip && readout && width > 0 && (
				<ChartTooltip
					plotRef={ref}
					readout={readout}
					snap={snap}
					orientation={orientation}
					emphasis={seriesEmphasis}
				/>
			)}
		</div>
	)

	return (
		<div
			data-slot="chart"
			className={cn(
				'flex flex-col gap-3',
				fixedWidth === undefined && 'w-full',
				containerFill && 'h-full',
				className,
			)}
			style={fixedWidth === undefined ? undefined : { width: fixedWidth }}
		>
			<ChartEmphasisContext value={emphasis}>
				<ChartHoverContext value={hover}>
					<ChartFigure
						plot={plotRegion}
						legend={legend}
						legendPlacement={legendPlacement}
						aside={aside}
						containerFill={containerFill}
						aspect={aspect}
					/>
				</ChartHoverContext>
			</ChartEmphasisContext>

			{readout && <ChartTable readout={readout} />}

			{annotations}
		</div>
	)
}

/** Props for {@link ChartFigure}. @internal */
type ChartFigureProps = {
	plot: ReactNode
	legend: ReactNode
	legendPlacement: ChartLegendPlacement
	/** The legend is a side panel, so the plot and legend lay out in a row from lg. */
	aside: boolean
	/** The frame fills its container height, so the figure grows to hold it. */
	containerFill: boolean
	/** The whole-chart `width / height`, carried as CSS `aspect-ratio`; unset reserves none. */
	aspect?: number
}

/**
 * The legend and plot laid out together under the whole-chart aspect-ratio: the
 * plot fills what the legend's natural size leaves, so the ratio describes the
 * chart rather than the plot alone. A side legend lays the two out in a row from
 * lg — the panel always under the chart below it, so a left panel reverses the
 * row instead of moving in the DOM — else they stack with the legend banding
 * above or below.
 *
 * @internal
 */
function ChartFigure({
	plot,
	legend,
	legendPlacement,
	aside,
	containerFill,
	aspect,
}: ChartFigureProps) {
	// A height-measured frame (a shared ratio or a container fill) stretches the
	// side legend and plot to one height so the plot fills its column; a fixed
	// frame centers them, the plot keeping its own height beside the legend.
	const stretch = aspect !== undefined || containerFill

	const layout = aside
		? cn(
				'flex-col gap-2',
				stretch ? 'lg:items-stretch' : 'lg:items-center',
				legendPlacement === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row',
			)
		: 'flex-col gap-3'

	return (
		<div
			data-slot="chart-figure"
			className={cn('flex min-h-0', layout, containerFill && 'h-full flex-1')}
			style={aspect === undefined ? undefined : { aspectRatio: aspect }}
		>
			{aside ? (
				<>
					{plot}

					{legend}
				</>
			) : (
				<>
					{legendPlacement === 'top' && legend}

					{plot}

					{legendPlacement === 'bottom' && legend}
				</>
			)}
		</div>
	)
}
