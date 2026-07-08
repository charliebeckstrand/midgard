'use client'

import { type ReactNode, type RefObject, useMemo, useRef, useState } from 'react'
import type { ContextMenuConfig } from '../../components/context-menu'
import { cn } from '../../core'
import type { FrameReserve } from '../../hooks'
import { k } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'
import { ChartContextMenu } from './chart-context-menu'
import { ChartHeader } from './chart-header'
import type { ChartOrientation } from './chart-orientation'
import { ChartPlotBox } from './chart-plot-box'
import type { ChartLegendPlacement } from './chart-schema'
import type { ChartSnap } from './chart-snap'
import { ChartTable } from './chart-table'
import type { ChartTier } from './chart-tier'
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
 * The header, spark veil, and legend a framed chart draws at its resolved tier.
 * A framed tier bands the header above the plot inside the aspect box and keeps
 * the legend beside or below it; spark strips both to bare marks — the header
 * leaves the flow for a centered hover / focus veil over the plot, and the
 * legend drops entirely so the `flex-1` plot reclaims the whole aspect box and
 * draws as a pure sparkline, rather than wrapping under a legend band that
 * crushes it to a sliver of dashes. The series then read on the hover tooltip,
 * as the title does on the veil. A chart with no title or subtitle draws no
 * header either way.
 *
 * @internal
 */
function chartChrome(
	tier: ChartTier | undefined,
	title: string | undefined,
	subtitle: string | undefined,
	legend: ReactNode,
): { header: ReactNode; sparkVeil: ReactNode; legend: ReactNode } {
	const spark = tier === 'spark'

	const head =
		title || subtitle ? <ChartHeader title={title} subtitle={subtitle} veil={spark} /> : null

	return {
		header: spark ? null : head,
		sparkVeil: spark ? head : null,
		legend: spark ? null : legend,
	}
}

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
	 * the whole chart — plot and legend together — holds the ratio as a preference
	 * a definite-height parent can clamp, the plot filling what the legend's
	 * natural size leaves. Unset, no wrapper ratio: the plot box reserves its own
	 * (a side legend banding beside it) or the frame is fixed / free-form.
	 */
	aspect?: number
	/**
	 * The resolved anatomy tier, published on the root as `data-tier` so a
	 * dashboard tile can co-style its own chrome with the chart's resolution.
	 * Omitted, no attribute renders.
	 */
	tier?: ChartTier
	/**
	 * The chart title, drawn above the plot inside the aspect box (so the drawing
	 * fills the height it leaves) and clipped to one line with a reveal tooltip. At
	 * the spark tier it leaves the flow for a centered hover / focus veil over the
	 * marks instead.
	 */
	title?: string
	/** The chart subtitle, muted under the {@link ChartFrameProps.title | title}, sharing its clip and spark veil. */
	subtitle?: string
	/** The prepared legend row, or `null` to omit it (single series). */
	legend: ReactNode
	/**
	 * Where the legend sits: a row under or above the plot — centered on
	 * mobile, justified edge to edge from `sm` — or a static panel beside it,
	 * side by side once the chart's own container is wide enough and always under
	 * the chart below that width.
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
	/**
	 * The right-click context menu config, forwarded from the chart's prop. `false`
	 * suppresses the menu; omitted, the default actions show alone.
	 * @see {@link ChartContextMenu}
	 */
	contextMenu?: ContextMenuConfig | false
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
	tier,
	title,
	subtitle,
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
	contextMenu,
	children,
	...label
}: ChartFrameProps) {
	// The chart root, read by the context menu for its `<svg>` (image export) and
	// cloned for the fullscreen view.
	const rootRef = useRef<HTMLDivElement>(null)

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

	const [pointerReference, setPointerReference] = useState<number | null>(null)

	const [activeReference, setActiveReference] = useState<number | null>(null)

	// Spark sheds its hover chrome with the rest of its anatomy: a sparkline reveals
	// what it is through the title veil on hover, not a data readout, so the tooltip
	// — and the keyboard cursor whose only output is that tooltip — stand down. The
	// accessible name and the data table still carry its values. Every wider tier
	// keeps the caller's `tooltip`.
	const tooltipShown = tooltip && tier !== 'spark'

	// Arrow-key navigation over the value points and reference lines, driving the
	// same hover the pointer does — a tab stop only where a readout can answer it.
	const keyboard = useChartKeyboard(
		focus,
		orientation ?? 'vertical',
		tooltipShown && readout !== null,
		hover.set,
		setActiveReference,
		onActiveSeries,
	)

	// The marks recede when either input emphasises a reference: the pointer over a
	// rule (or its legend chip), or the keyboard cursor parked on one. The pointed
	// index wins over a still-held keyboard focus, and the sibling rules recede to
	// whichever it resolves to.
	const emphasis = useMemo<ChartEmphasis>(
		() => ({
			referenceActive: pointerReference !== null || activeReference !== null,
			setReferenceActive: setPointerReference,
			activeReference,
			emphasizedReference: pointerReference ?? activeReference,
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

	// A framed tier bands the header above the plot and keeps the legend; spark
	// strips both to bare marks — the header to a centered hover / focus veil, the
	// legend gone so the plot reclaims the whole aspect box (see chartChrome).
	const { header, sparkVeil, legend: legendFrame } = chartChrome(tier, title, subtitle, legend)

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

			{sparkVeil}

			{tooltipShown && readout && width > 0 && (
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
		<ChartContextMenu contextMenu={contextMenu} rootRef={rootRef} readout={readout} title={title}>
			<div
				ref={rootRef}
				data-slot="chart"
				data-tier={tier}
				className={cn(
					// A query container so the legend lays out against the chart's own width,
					// not the viewport — a chart in a narrow column stacks its legend even on
					// a wide screen. `w-full` fills whatever box it is handed: the anatomy
					// resolves from that box (the intrinsic tiers), so a chart reads at any
					// width without a max-width cap. A `className` still overrides through
					// twMerge for a caller that wants to bound it.
					// The named group scopes the spark header's hover / focus veil to the
					// chart, so it never trips on an unnamed `group-hover` inside the marks.
					'group/chart @container flex flex-col gap-3',
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
							header={header}
							legend={legendFrame}
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
		</ChartContextMenu>
	)
}

/** Props for {@link ChartFigure}. @internal */
type ChartFigureProps = {
	plot: ReactNode
	/** The inline header banded above the plot inside the aspect box, or `null`. */
	header: ReactNode
	legend: ReactNode
	legendPlacement: ChartLegendPlacement
	/** The legend is a side panel, so the plot and legend lay out in a row once the container has room. */
	aside: boolean
	/** The frame fills its container height, so the figure grows to hold it. */
	containerFill: boolean
	/** The whole-chart `width / height`, carried as CSS `aspect-ratio`; unset reserves none. */
	aspect?: number
}

/**
 * The legend and plot laid out together under the whole-chart aspect-ratio: the
 * plot fills what the legend's natural size leaves, so the ratio describes the
 * chart rather than the plot alone, and it holds as a preference a definite-height
 * parent can clamp (the box-law) rather than a height the drawing forces. A side
 * legend lays the two out in a row once the container has room (`@sm`) — the panel
 * always under the chart below that, so a left panel reverses the row instead of
 * moving in the DOM — else they stack with the legend banding above or below.
 *
 * @internal
 */
function ChartFigure({
	plot,
	header,
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

	// The plot-and-legend arrangement, filling the height the header leaves. A side
	// rail bands beside the plot in a row once the container has room (`@sm`, the
	// rail's engage width) — below that it stacks under the plot at full width, and
	// a left rail reverses the row rather than moving in the DOM. A stacked legend
	// bands above or below directly, no wrapper. Either way the `flex-1` plot draws
	// into the ratio's remainder, so the whole figure still holds the ratio.
	const body = aside ? (
		<div
			data-slot="chart-body"
			className={cn(
				'flex min-h-0 flex-1 flex-col gap-2',
				stretch ? '@sm:items-stretch' : '@sm:items-center',
				legendPlacement === 'left' ? '@sm:flex-row-reverse' : '@sm:flex-row',
			)}
		>
			{plot}

			{legend}
		</div>
	) : (
		<>
			{legendPlacement === 'top' && legend}

			{plot}

			{legendPlacement === 'bottom' && legend}
		</>
	)

	return (
		<div
			data-slot="chart-figure"
			// The ratio rides `aspect-ratio` as a preference, not a demand: `max-h-full`
			// lets a definite-height parent clamp the figure below what the ratio would
			// ask for, and the `flex-1` plot then measures the clamped height and draws
			// to fit — the box is law. The header bands above at its own height, so the
			// plot fills what the ratio leaves under it. An auto-height parent ignores
			// `max-h-full`, so the ratio governs as normal; `min-h-0` lets the clamp
			// actually shrink it.
			className={cn(
				'flex min-h-0 flex-col gap-3',
				aspect !== undefined && 'max-h-full',
				containerFill && 'h-full flex-1',
			)}
			style={aspect === undefined ? undefined : { aspectRatio: aspect }}
		>
			{header}

			{body}
		</div>
	)
}
