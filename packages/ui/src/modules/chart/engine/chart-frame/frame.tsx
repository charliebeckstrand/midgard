'use client'

import {
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import { announce, cn } from '../../../../core'
import { type FrameReserve, useComposedRef } from '../../../../hooks'
import { k } from '../../../../recipes/kata/chart'
import type { AccessibleName } from '../../../../types'
import { holdTextSelection } from '../../../../utilities/hold-text-selection'
import type { ChartContextMenuConfig } from '../chart-context-menu'
import { ChartContextMenu } from '../chart-context-menu'
import { ChartHeader } from '../chart-header'
import { type ChartLegendPlacement, legendAside } from '../chart-legend/schema'
import { ChartMenuButton } from '../chart-menu-button'
import type { ChartOrientation } from '../chart-orientation'
import { ChartPlotBox } from '../chart-plot-box'
import type { ChartSnap } from '../chart-snap'
import { ChartTable } from '../chart-table'
import type { ChartTier } from '../chart-tier'
import { ChartTooltip, describeReadout } from '../chart-tooltip'
import {
	type ChartEmphasis,
	ChartEmphasisContext,
	ChartHoverContext,
	type ChartHoverState,
	ChartMarkEmphasisContext,
	ChartMarkPointContext,
	type ChartMarkRef,
	ChartReferencePointContext,
	ChartSeriesEmphasisContext,
	ChartSeriesFocusContext,
	ChartTierContext,
	chartMarkEmphasis,
	createChartHoverStore,
	sameMark,
} from '../context'
import type { ChartReadoutSource } from '../types'
import {
	type ChartFocusTargets,
	type ChartKeyboardProps,
	useChartKeyboard,
} from '../use-chart-keyboard'

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
 * header either way, and neither does a chart with `heading` off.
 *
 * The figure takes its name from the title of an inline header, through
 * `aria-labelledby`. A `figcaption` would not do: the header row also holds the
 * touch menu button, and the name of a figcaption includes the name of that
 * button.
 *
 * @internal
 */
function chartChrome(
	tier: ChartTier | undefined,
	heading: boolean,
	title: string | undefined,
	titleId: string,
	subtitle: string | undefined,
	legend: ReactNode,
): { header: ReactNode; sparkVeil: ReactNode; legend: ReactNode; labelledBy?: string } {
	const spark = tier === 'spark'

	const head =
		heading && (title || subtitle) ? (
			<ChartHeader
				title={title}
				titleId={titleId}
				subtitle={subtitle}
				veil={spark}
				action={<ChartMenuButton title={title} place="header" />}
			/>
		) : null

	return {
		header: spark ? null : head,
		sparkVeil: spark ? head : null,
		legend: spark ? null : legend,
		labelledBy: !spark && heading && title ? titleId : undefined,
	}
}

/** The accessible-name attributes of the plot region. @internal */
type PlotName = { 'aria-label'?: string; 'aria-labelledby'?: string }

/**
 * The accessible name of the plot region, picked by name. A chart hands the
 * frame the rest of its props, so a prop that the chart does not take off
 * reaches the frame too. The pick keeps such a prop off the `role="img"` region.
 *
 * @internal
 */
export function plotName(label: PlotName): PlotName {
	return { 'aria-label': label['aria-label'], 'aria-labelledby': label['aria-labelledby'] }
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
			keyboard && k.focus,
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
 * @param count - The number of series, or `undefined` for no bound.
 * @returns The emphasis, or `null` while the pointed series is hidden or past
 * the count, and the setter, which keeps its identity.
 * @internal
 */
function useSeriesEmphasis(
	hidden: ReadonlySet<number>,
	count: number | undefined,
): [number | null, (index: number | null) => void] {
	const [focus, setFocus] = useState<number | null>(null)

	const held = focus !== null && !hidden.has(focus) && (count === undefined || focus < count)

	return [held ? focus : null, setFocus]
}

/**
 * The index a right-click targets. It is the hovered category while the
 * pointer is on a mark. A chart that snaps reads the whole column, so there it
 * is the hovered category anywhere. Off every mark it is `null`, so a per-mark
 * menu item does not show on bare plot.
 *
 * @internal
 */
function menuTarget(hover: ChartHoverState, snaps: boolean): number | null {
	return hover.onData || snaps ? hover.index : null
}

/** Props for {@link ChartFrame}; the accessible name spreads onto the `role="img"` plot region. @internal */
export type ChartFrameProps = AccessibleName & {
	/**
	 * Measuring ref from `usePlotFrame`, attached to the plot region — the box
	 * the drawing actually fills, so a side legend never inflates the width.
	 */
	ref: RefObject<HTMLDivElement | null>
	/**
	 * Receives the chart root, which is inside the chart's font context. A chart
	 * that measures its label text (`useChartTextWidth`) passes its `hostRef`. A
	 * chart that also measures the root box composes the two refs, as the heatmap
	 * does.
	 */
	textHostRef?: Ref<HTMLDivElement>
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
	/**
	 * Whether the title and the subtitle draw as a header. Off, the title names
	 * the context menu alone: it heads the fullscreen view and the export files.
	 * The heatmap draws no heading.
	 * @defaultValue true
	 */
	heading?: boolean
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
	 * The legend is a color-scale rail, not a categorical panel. A rail beside
	 * the plot keeps the wider gap that the choropleth's rail keeps, so the two
	 * color-scaled charts match.
	 * @defaultValue false
	 */
	rail?: boolean
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
	 * The number of series, and for a pie the number of rows. An emphasis at or
	 * past it resolves to `null`: the data can drop the series that a still
	 * pointer or a legend entry held. Omitted, no bound applies.
	 */
	seriesCount?: number
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
	/**
	 * A tooltip that the chart draws in place of the shared {@link ChartTooltip}.
	 * It mounts under the same gate: `tooltip` on, a tier above spark, a readout,
	 * and a measured width. It reads the hover through `useChartHover`, as the
	 * shared one does. The heatmap reads one cell with it, not a category.
	 */
	customTooltip?: ReactNode
	/** Snap targets when the crosshair snaps, carrying the tooltip to the intersection. */
	snap?: ChartSnap
	/**
	 * Per-category anchor points that make the plot a keyboard tab stop: the arrow
	 * keys walk them through the same hover the pointer drives. Absent — or empty —
	 * the region stays a plain non-focusable `role="img"`.
	 */
	focus?: ChartFocusTargets
	/**
	 * The text of the reference line at an index of {@link focus}'s `references`,
	 * or `null` for none. A key that moves the cursor onto the line speaks this
	 * text through the shared polite live region, because the rule's tooltip sits
	 * in the `aria-hidden` plot. Absent, a stop on a rule speaks nothing.
	 */
	describeReference?: (reference: number) => string | null
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
 * the tooltip overlay. Owns the hover store and provides it through
 * `ChartHoverContext`. A pointer move renders only the readers that subscribe
 * to it: the overlays and hit layers, not the frame or the marks. Owns the series emphasis too, and provides it through
 * `ChartSeriesFocusContext` and `ChartSeriesEmphasisContext`. A legend hover
 * therefore renders the frame and the readers of the emphasis, not the chart
 * body. The readout thunk and the data table keep their identity.
 *
 * @internal
 */
export function ChartFrame({
	ref,
	textHostRef,
	width,
	fixedWidth,
	height,
	reserve,
	fill = false,
	aspect,
	tier,
	title,
	subtitle,
	heading = true,
	legend,
	legendPlacement = 'bottom',
	rail = false,
	readout,
	readoutOrder,
	hidden = NONE_HIDDEN,
	seriesCount,
	emphasizeMarks = false,
	tooltip,
	customTooltip,
	snap,
	focus,
	describeReference,
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

	const rootRefs = useComposedRef(rootRef, textHostRef)

	// The hover lives in a store the frame makes once. A pointer move then renders
	// only the readers that subscribe to it (tooltip, crosshair, hit layers), and
	// not the frame, its header, its legend, or its context menu.
	const [hoverStore] = useState(createChartHoverStore)

	// The mark under the pointer at the moment the right-click landed — snapshotted on the contextmenu
	// event, NOT read live from the hover store. The open menu overlays the plot, so moving the pointer toward a
	// menu item immediately leaves the plot and clears the hover; a live read would recompute the items
	// mid-interaction and drop the per-mark entry the user is about to click.
	//
	// Held as the bare index so React can bail on a repeat right-click over the same mark (or on plot
	// padding twice, where it stays null). `ChartContextMenu` takes the index and mints the target
	// object a function-form `items` receives.
	const [menuIndex, setMenuIndex] = useState<number | null>(null)

	// The frame owns the series emphasis, not the chart body: a legend hover then
	// does not run the body, which would make a new readout thunk and format the
	// data table again.
	const [seriesEmphasis, setSeriesFocus] = useSeriesEmphasis(hidden, seriesCount)

	const [pointerReference, setPointerReference] = useState<number | null>(null)

	const [activeReference, setActiveReference] = useState<number | null>(null)

	// The mark the pointer sits on — a bar, a line, a disc — resolved by the hit
	// layer. It recedes every other mark behind it, and merges below with the
	// series the legend or keyboard emphasizes: the pointed mark wins while it's
	// held, the coarse series emphasis stands in the rest of the time.
	const [pointedMark, setPointedMark] = useState<ChartMarkRef | null>(null)

	const pointMark = useCallback((mark: ChartMarkRef | null) => {
		// Bail on a no-op so sweeping within one mark — or off the marks entirely
		// once already clear — costs no mark re-render, the same guard the hover store keeps.
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

	// The tooltip is `aria-hidden`, so a key that moves the cursor onto a point
	// also speaks the readout of that point through the shared polite live
	// region. A pointer move speaks nothing.
	const announceRead = (index: number, series: number | null) => {
		const text = readout && describeReadout(readout(), index, series, readoutOrder)

		if (text) announce(text)
	}

	// The same for a key that moves the cursor onto a reference line: it speaks the
	// label and the value of that line.
	const announceReference = (reference: number) => {
		const text = describeReference?.(reference)

		if (text) announce(text)
	}

	// Arrow-key navigation over the value points and reference lines, driving the
	// same hover the pointer does — a tab stop only where a readout can answer it.
	const keyboard = useChartKeyboard(
		focus,
		orientation ?? 'vertical',
		tooltipShown && readout !== null,
		hoverStore,
		setActiveReference,
		keyboardEmphasis ? setSeriesFocus : ignoreActiveSeries,
		announceRead,
		announceReference,
	)

	// The marks recede when either input emphasizes a reference: the pointer over a
	// rule (or its legend chip), or the keyboard cursor parked on one. The pointed
	// index wins over a still-held keyboard focus, and the sibling rules recede to
	// whichever it resolves to.
	const emphasis = useMemo<ChartEmphasis>(
		() => ({ activeReference, emphasizedReference: pointerReference ?? activeReference }),
		[pointerReference, activeReference],
	)

	// The mark emphasis the marks and tooltip both read: the pointed mark, else the
	// series the legend or keyboard emphasizes, lifted to a whole-series reference.
	// The held category selection lights only its own data under either.
	const markSeries = emphasizeMarks ? seriesEmphasis : null

	const markEmphasis = useMemo(
		() => chartMarkEmphasis(pointedMark, markSeries, selected),
		[pointedMark, markSeries, selected],
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
			// The drawing is physical: its geometry runs left to right, so its text
			// anchors must too. In a right-to-left page an end anchor would otherwise
			// run each label from its anchor into the plot. The bidi of the text
			// itself still reads a right-to-left label in its own order.
			direction="ltr"
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
	// A chart with `heading` off keeps its title for the context menu alone.
	const titleId = useId()

	const {
		header,
		sparkVeil,
		legend: legendFrame,
		labelledBy,
	} = chartChrome(tier, heading, title, titleId, subtitle, legend)

	const plotRegion = (
		<div
			ref={ref}
			data-slot="chart-plot"
			role="img"
			{...plotName(label)}
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

			{tooltipShown &&
				readout &&
				width > 0 &&
				(customTooltip ?? (
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
				))}
		</div>
	)

	const chartRoot = (
		<div
			ref={rootRefs}
			data-slot="chart"
			data-tier={tier}
			// A touch hold here does not open the context menu.
			data-touch-readout=""
			// Capture phase, so the snapshot lands before the menu's own handler opens it — the menu then
			// renders from a target that stays put however the pointer travels while it is open.
			onContextMenuCapture={() => setMenuIndex(menuTarget(hoverStore.get(), snap != null))}
			// A held touch selects no text on the page, a chart with no context menu included.
			onPointerDown={holdTextSelection}
			className={cn(
				// A query container so the legend lays out against the chart's own width,
				// not the viewport — a chart in a narrow column stacks its legend even on
				// a wide screen. `w-full` fills whatever box it is handed: the anatomy
				// resolves from that box (the intrinsic tiers), so a chart reads at any
				// width without a max-width cap. A `className` still overrides through
				// twMerge for a caller that wants to bound it.
				// The named group scopes the spark header's hover / focus veil to the
				// chart, so it never trips on an unnamed `group-hover` inside the marks.
				'group/chart @container flex flex-col',
				k.gap.frame,
				// The whole chart, labels included, selects no text and opens no callout
				// under a hold.
				k.touch.readout,
				// A tap selects, so no double-tap zoom holds it back.
				k.touch.tap,
				fixedWidth === undefined && 'w-full',
				// A chart that fills its box keeps all of its boxes in that box. The touch
				// target of a legend control reaches past the control. At the bottom edge
				// of the chart, it would otherwise add scroll range to a box that scrolls,
				// such as the content box of a dashboard tile. `overflow-clip` makes no
				// scroll container, so the chart stays out of the scroll of its box.
				containerFill && 'h-full overflow-clip',
				className,
			)}
			style={fixedWidth === undefined ? undefined : { width: fixedWidth }}
		>
			<ChartTierContext value={tier ?? 'standard'}>
				<ChartEmphasisContext value={emphasis}>
					<ChartReferencePointContext value={setPointerReference}>
						<ChartMarkEmphasisContext value={markEmphasis}>
							<ChartMarkPointContext value={pointMark}>
								<ChartSeriesFocusContext value={setSeriesFocus}>
									<ChartSeriesEmphasisContext value={seriesEmphasis}>
										<ChartHoverContext value={hoverStore}>
											<ChartFigure
												plot={plotRegion}
												header={header}
												labelledBy={labelledBy}
												legend={legendFrame}
												legendPlacement={legendPlacement}
												rail={rail}
												aside={aside}
												containerFill={containerFill}
												aspect={aspect}
											/>
										</ChartHoverContext>
									</ChartSeriesEmphasisContext>
								</ChartSeriesFocusContext>
							</ChartMarkPointContext>
						</ChartMarkEmphasisContext>
					</ChartReferencePointContext>
				</ChartEmphasisContext>
			</ChartTierContext>

			{readout && (
				<ChartTable
					readout={readout}
					label={plotName(label)['aria-label']}
					labelledBy={plotName(label)['aria-labelledby']}
				/>
			)}

			{annotations}

			{/* Inside a box with a header row, such as a dashboard tile, the touch menu
			    button goes to that row. Otherwise the chart header holds it. */}
			<ChartMenuButton title={title} place="host" />
		</div>
	)

	return (
		<ChartContextMenu
			contextMenu={contextMenu}
			rootRef={rootRef}
			readout={readout}
			title={title}
			label={plotName(label)['aria-label']}
			fullscreen={fullscreen}
			// The frame owns the hover store, and this wrapper sits outside `ChartHoverContext` (it wraps
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
	/** The id of the visible title, which names the figure, or `undefined` for no visible title. */
	labelledBy?: string
	legend: ReactNode
	legendPlacement: ChartLegendPlacement
	/** The legend is a color-scale rail, which keeps a wider gap beside the plot. */
	rail: boolean
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
	labelledBy,
	legend,
	legendPlacement,
	rail,
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
				'flex min-h-0 flex-1 flex-col',
				rail ? k.gap.rail : k.gap.legend,
				stretch ? '@sm:items-stretch' : '@sm:items-center',
				// The side is physical: a right-to-left row runs from the right, so it
				// swaps the order back, and a `left` legend still draws on the left.
				legendPlacement === 'left'
					? '@sm:flex-row-reverse rtl:@sm:flex-row'
					: '@sm:flex-row rtl:@sm:flex-row-reverse',
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
		// A figure, so the visible title, the plot, and the legend are one unit that
		// the title names.
		<figure
			data-slot="chart-figure"
			aria-labelledby={labelledBy}
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
				'flex min-h-0 flex-col',
				k.gap.frame,
				aspect !== undefined && 'max-h-full',
				containerFill && 'h-full flex-1',
			)}
			style={aspect === undefined ? undefined : { aspectRatio: aspect }}
		>
			{header}

			{body}
		</figure>
	)
}
