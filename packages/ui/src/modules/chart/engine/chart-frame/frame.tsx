'use client'

import {
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../../../core'
import type { FrameReserve } from '../../../../hooks'
import { k } from '../../../../recipes/kata/chart'
import type { AccessibleName } from '../../../../types'
import type { ChartContextMenuConfig } from '../chart-context-menu'
import { ChartContextMenu } from '../chart-context-menu'
import { ChartHeader } from '../chart-header'
import { type ChartLegendPlacement, legendAside } from '../chart-legend/schema'
import type { ChartOrientation } from '../chart-orientation'
import { ChartPlotBox } from '../chart-plot-box'
import type { ChartSnap } from '../chart-snap'
import { ChartTable } from '../chart-table'
import type { ChartTier } from '../chart-tier'
import { ChartTooltip } from '../chart-tooltip'
import {
	type ChartEmphasis,
	ChartEmphasisContext,
	type ChartHover,
	ChartHoverContext,
	ChartMarkEmphasisContext,
	type ChartMarkRef,
	type ChartPoint,
	ChartSeriesEmphasisContext,
	ChartSeriesFocusContext,
	ChartTierContext,
	chartMarkEmphasis,
	sameMark,
} from '../context'
import type { ChartReadoutSource } from '../types'
import {
	type ChartFocusTargets,
	type ChartKeyboardProps,
	useChartKeyboard,
} from '../use-chart-keyboard'

/** Whether two hover points coincide, so a redundant hover write can bail. @internal */
function samePoint(a: ChartPoint | null, b: ChartPoint | null): boolean {
	return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

/** The stable no-op the keyboard takes when its stops name no single series. @internal */
function ignoreActiveSeries(_series: number | null): void {}

/** The default for a chart that hides no series. @internal */
const NONE_HIDDEN: ReadonlySet<number> = new Set()

/**
 * The header, spark veil, and legend a framed chart draws at its resolved tier.
 * A framed tier bands the header above the plot inside the aspect box, and keeps
 * the legend beside or below it. Spark strips both to bare marks. The header
 * leaves the flow for a centered hover / focus veil over the plot. The legend
 * drops entirely, so the `flex-1` plot reclaims the whole aspect box and draws
 * as a pure sparkline. It therefore never wraps under a legend band that
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
 * takes the space its siblings leave: `flex-1` along the figure's main axis,
 * shrinkable across it. A side legend therefore narrows it (`min-w-0`), and a
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

/**
 * The series emphasis of a frame: the series that a legend entry, the keyboard
 * cursor, or a pie slice points at, and its setter.
 *
 * @param hidden - The series that cannot hold the emphasis.
 * @returns The emphasis, or `null` while the pointed series is hidden, and the
 * setter, which keeps its identity.
 * @internal
 */
function useSeriesEmphasis(
	hidden: ReadonlySet<number>,
): [number | null, (index: number | null) => void] {
	const [focus, setFocus] = useState<number | null>(null)

	return [focus !== null && !hidden.has(focus) ? focus : null, setFocus]
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
	 * ChartFrameProps.aspect}), and the free-form container-filling frame
	 * (`aspectRatio={false}`). A definite-height parent then no longer collapses
	 * the plot to nothing.
	 * @defaultValue false
	 */
	fill?: boolean
	/**
	 * The `width / height` the figure wrapper carries as CSS `aspect-ratio`. The
	 * whole chart — plot and legend together — therefore holds the ratio as a
	 * preference a definite-height parent can clamp. The plot fills what the
	 * legend's natural size leaves. Unset, no wrapper ratio: the plot box reserves its own
	 * (a side legend banding beside it) or the frame is fixed / free-form.
	 */
	aspect?: number
	/**
	 * The resolved anatomy tier, published on the root as `data-tier` so a
	 * dashboard tile can co-style its own chrome with the chart's resolution.
	 * The frame also owns the tier's spark posture. At `'spark'` it stands the
	 * tooltip and keyboard down, veils the header, and renders the drawing
	 * pointer-inert. It republishes the tier through `ChartTierContext`, so the
	 * interactive layers inside stand themselves down. A sparkline is read-only
	 * without any per-chart gating. Omitted, no attribute renders and the frame
	 * treats the chart as framed (`'standard'`).
	 */
	tier?: ChartTier
	/**
	 * The chart title, drawn above the plot inside the aspect box (so the drawing
	 * fills the height it leaves). It is clipped to one line with a reveal tooltip. At
	 * the spark tier it leaves the flow for a centered hover / focus veil over the
	 * marks instead.
	 */
	title?: string
	/** The chart subtitle, muted under the {@link ChartFrameProps.title | title}, sharing its clip and spark veil. */
	subtitle?: string
	/** The prepared legend row, or `null` to omit it (single series). */
	legend: ReactNode
	/**
	 * Where the legend sits: a row under or above the plot, or a static panel
	 * beside it. A row is centered at all widths. A panel sits side by side once
	 * the chart's own container is wide enough, and always under the chart below
	 * that width.
	 * @defaultValue 'bottom'
	 */
	legendPlacement?: ChartLegendPlacement
	/**
	 * The values behind the marks as a cached thunk, or `null` when there is
	 * nothing to read. A thunk so the mount-critical render never formats the
	 * cells ({@link ChartReadoutSource}). The tooltip materializes it on the first
	 * hover, and the deferred data table a low-priority beat after mount.
	 */
	readout: ChartReadoutSource | null
	/**
	 * The series indices, in the order the tooltip lists {@link readout}'s rows —
	 * the marks' own visible top-to-bottom order. Omitted, the rows keep the
	 * readout's series order. The hidden data table always reads in series order.
	 */
	readoutOrder?: number[]
	/**
	 * The series that cannot hold the series emphasis: the series the legend
	 * toggled off, and for a pie the rows that draw no slice. An emphasis on one of
	 * them resolves to `null`, because to dim each mark against an invisible series
	 * would read as a broken chart. Empty by default.
	 */
	hidden?: ReadonlySet<number>
	/**
	 * The series emphasis joins the {@link ChartMarkEmphasis} that the marks and the
	 * tooltip read. The tooltip then dims each other row, as the marks do. A chart
	 * whose marks read {@link ChartSeriesEmphasisContext} themselves, such as the
	 * pie, leaves it off.
	 * @defaultValue false
	 */
	emphasizeMarks?: boolean
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
	 * The keyboard cursor emphasizes the series it lands on (`null` off any), in
	 * the same channel as the legend. The marks then recede the rest and the
	 * tooltip dims their rows. Off, keyboard navigation leaves the emphasis alone:
	 * a chart whose stops name no single series.
	 * @defaultValue false
	 */
	keyboardEmphasis?: boolean
	/**
	 * The data indices of the held category selection, or `null`. Their marks keep
	 * full strength and the others recede, until a hover takes the emphasis.
	 */
	selected?: ReadonlySet<number> | null
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
	contextMenu?: ChartContextMenuConfig | false
	/**
	 * A fresh copy of the whole chart for the menu's fullscreen view — a live
	 * re-mount, so hover and keyboard keep working at the dialog size. Ignored
	 * when the frame is itself rendering inside the fullscreen dialog.
	 */
	fullscreen?: ReactElement
	/** The SVG content: axes, gridlines, marks, and the hit layer. */
	children: ReactNode
}

/**
 * The shared chart shell: legend and visually-hidden data table as plain
 * HTML around a `role="img"` plot region holding the `aria-hidden` SVG and
 * the tooltip overlay. Owns the hover index and provides it through
 * `ChartHoverContext`, so pointer movement re-renders the overlays — never
 * the marks. Owns the series emphasis too, and provides it through
 * `ChartSeriesFocusContext` and `ChartSeriesEmphasisContext`. A legend hover
 * therefore renders the frame and the readers of the emphasis, not the chart
 * body. The readout thunk and the data table keep their identity.
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
	readoutOrder,
	hidden = NONE_HIDDEN,
	emphasizeMarks = false,
	tooltip,
	snap,
	focus,
	keyboardEmphasis = false,
	selected = null,
	orientation,
	className,
	overlay,
	annotations,
	contextMenu,
	fullscreen,
	children,
	...label
}: ChartFrameProps) {
	// The chart root, read by the context menu to rasterize the chart for an
	// image export.
	const rootRef = useRef<HTMLDivElement>(null)

	const [pointed, setPointed] = useState<{
		index: number | null
		point: ChartPoint | null
		onData: boolean
	}>({ index: null, point: null, onData: false })

	// The mark under the pointer at the moment the right-click landed — snapshotted on the contextmenu
	// event, NOT read live from `pointed`. The open menu overlays the plot, so moving the pointer toward a
	// menu item immediately leaves the plot and clears the hover; a live read would recompute the items
	// mid-interaction and drop the per-mark entry the user is about to click.
	//
	// Held as the bare index so React can bail on a repeat right-click over the same mark (or on plot
	// padding twice, where it stays null). `ChartContextMenu` takes the index and mints the target
	// object a function-form `items` receives.
	const [menuIndex, setMenuIndex] = useState<number | null>(null)

	// The visually-hidden data table holds one row per datum, so at large row
	// counts materializing and committing it dominates — yet nothing visual waits
	// on it and assistive tech reads it from the settled DOM, not the first frame.
	// Deferring the thunk drops it off the urgent render: the plot paints at full
	// priority, then React re-renders the table alone in a low-priority pass, and
	// only that pass calls the thunk — the mount commit never formats a cell. The
	// `null` initial value holds the table out of the very first commit too, so a
	// fresh mount paints its marks before any of it; a data change keeps the prior
	// table up for a beat rather than blocking the new marks behind a rebuild.
	// Parity is unchanged — the table always converges on the current readout,
	// one low-priority commit behind.
	const tableReadout = useDeferredValue(readout, null)

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

	// The frame owns the series emphasis, not the chart body: a legend hover then
	// does not run the body, which would make a new readout thunk and format the
	// data table again.
	const [seriesEmphasis, setSeriesFocus] = useSeriesEmphasis(hidden)

	const [pointerReference, setPointerReference] = useState<number | null>(null)

	const [activeReference, setActiveReference] = useState<number | null>(null)

	// The mark the pointer sits on — a bar, a line, a disc — resolved by the hit
	// layer. It recedes every other mark behind it, and merges below with the
	// series the legend or keyboard emphasizes: the pointed mark wins while it's
	// held, the coarse series emphasis stands in the rest of the time.
	const [pointedMark, setPointedMark] = useState<ChartMarkRef | null>(null)

	const pointMark = useCallback((mark: ChartMarkRef | null) => {
		// Bail on a no-op so sweeping within one mark — or off the marks entirely
		// once already clear — costs no mark re-render, the same guard hover.set keeps.
		setPointedMark((prev) => (sameMark(prev, mark) ? prev : mark))
	}, [])

	// The frame owns the spark posture end to end: it stands the tooltip and
	// keyboard down here, veils the header and drops the legend (chartChrome), lays
	// the `k.drawing` pointer veto over the SVG so nothing inside can take a hover,
	// click, or cursor, and publishes the tier through ChartTierContext so the
	// interactive layers — hit areas, crosshair, value labels, reference hovers —
	// stand themselves down. A chart never gates any of that per call site.
	const spark = tier === 'spark'

	// Spark sheds its hover chrome with the rest of its anatomy: a sparkline reveals
	// what it is through the title veil on hover, not a data readout, so the tooltip
	// — and the keyboard cursor whose only output is that tooltip — stand down. The
	// accessible name and the data table still carry its values. Every wider tier
	// keeps the caller's `tooltip`.
	const tooltipShown = tooltip && !spark

	// Arrow-key navigation over the value points and reference lines, driving the
	// same hover the pointer does — a tab stop only where a readout can answer it.
	const keyboard = useChartKeyboard(
		focus,
		orientation ?? 'vertical',
		tooltipShown && readout !== null,
		hover.set,
		setActiveReference,
		keyboardEmphasis ? setSeriesFocus : ignoreActiveSeries,
	)

	// The marks recede when either input emphasizes a reference: the pointer over a
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

	// The mark emphasis the marks and tooltip both read: the pointed mark, else the
	// series the legend or keyboard emphasizes, lifted to a whole-series reference.
	// The held category selection lights only its own data under either.
	const markSeries = emphasizeMarks ? seriesEmphasis : null

	const markEmphasis = useMemo(
		() => chartMarkEmphasis(pointedMark, markSeries, pointMark, selected),
		[pointedMark, markSeries, pointMark, selected],
	)

	// The SVG renders at its committed pixel size and anchors to the box's
	// top-left, its `viewBox` matching so user units map 1:1 to pixels — never
	// `size-full`, which would scale the drawing to whatever CSS size the box
	// currently holds. A resize moves the box at once but the geometry only on the
	// next commit, so a size-full SVG scales — axis labels and all — against a
	// stale viewBox every frame of a drag until it lands; pinned, the drawing holds
	// steady and the box (overflow-hidden) clips or reveals a one-frame edge sliver
	// instead. Absolute, so it stays out of flow and the box owns its own size.
	// At spark `k.drawing` renders the whole drawing pointer-inert — the veto half
	// of the spark posture, killing mark hover styling and any hit target inside.
	const svg = width > 0 && (
		<svg
			aria-hidden="true"
			className={cn('absolute left-0 top-0 block', k.drawing(spark))}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
		>
			{children}
		</svg>
	)

	const aside = legendAside(legendPlacement)

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
			{/* ChartPlotBox reserves the box height from its own width, steady before
			    the width is measured and across animation replays. It takes a fixed
			    pixel height instead, or (under `fill`) fills the height its region
			    already holds. The tooltip sits outside so its clip never touches it. */}
			<ChartPlotBox reserve={reserve} height={height} fill={fill}>
				{svg}
			</ChartPlotBox>

			{overlay}

			{sparkVeil}

			{tooltipShown && readout && width > 0 && (
				<ChartTooltip
					plotRef={ref}
					readout={readout}
					order={readoutOrder}
					snap={snap}
					orientation={orientation}
					// The pointed mark's series dims the other rows too, so a hovered bar or
					// line foregrounds its row exactly as the coarse legend emphasis does.
					emphasis={markEmphasis.mark?.series ?? null}
				/>
			)}
		</div>
	)

	const chartRoot = (
		<div
			ref={rootRef}
			data-slot="chart"
			data-tier={tier}
			// Capture phase, so the snapshot lands before the menu's own handler opens it — the menu then
			// renders from a target that stays put however the pointer travels while it is open.
			onContextMenuCapture={() => setMenuIndex(pointed.index)}
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
				// A long press opens the readout, as on the map. The whole chart, labels
				// included, therefore selects no text and opens no callout under a hold.
				// iOS Safari can select text in a descendant of a `select-none` box, so
				// every descendant also sets it.
				'select-none **:select-none [-webkit-touch-callout:none]',
				fixedWidth === undefined && 'w-full',
				containerFill && 'h-full',
				className,
			)}
			style={fixedWidth === undefined ? undefined : { width: fixedWidth }}
		>
			<ChartTierContext value={tier ?? 'standard'}>
				<ChartEmphasisContext value={emphasis}>
					<ChartMarkEmphasisContext value={markEmphasis}>
						<ChartSeriesFocusContext value={setSeriesFocus}>
							<ChartSeriesEmphasisContext value={seriesEmphasis}>
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
							</ChartSeriesEmphasisContext>
						</ChartSeriesFocusContext>
					</ChartMarkEmphasisContext>
				</ChartEmphasisContext>
			</ChartTierContext>

			{tableReadout && <ChartTable readout={tableReadout} />}

			{annotations}
		</div>
	)

	return (
		<ChartContextMenu
			contextMenu={contextMenu}
			rootRef={rootRef}
			readout={readout}
			title={title}
			fullscreen={fullscreen}
			// The frame owns the hover index, and this wrapper sits outside `ChartHoverContext` (it wraps
			// the provider), so the right-clicked mark travels down as a prop for a per-mark menu item.
			targetIndex={menuIndex}
		>
			{chartRoot}
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
 * The legend and plot laid out together under the whole-chart aspect-ratio. The
 * plot fills what the legend's natural size leaves, so the ratio describes the
 * chart rather than the plot alone. It holds as a preference a definite-height
 * parent can clamp (the box-law), rather than a height the drawing forces. A
 * side legend lays the two out in a row once the container has room (`@sm`).
 * The panel is always under the chart below that, so a left panel reverses the
 * row instead of moving in the DOM. Else they stack, with the legend banding
 * above or below.
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
			// The free-form fill frame's own box: its height is the tile's, unmoved by
			// the header and legend the tier mounts or drops inside it, so `usePlotFrame`
			// reads the tier's spark height off this rather than the plot's chrome-shrunk
			// remainder — which the tier would otherwise perturb into an oscillation.
			{...(containerFill && { 'data-plot-fill-container': '' })}
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
