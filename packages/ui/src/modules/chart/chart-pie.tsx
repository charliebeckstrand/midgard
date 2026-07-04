'use client'

import { motion } from 'motion/react'
import { type PointerEvent, type ReactNode, useId } from 'react'
import { cn } from '../../core'
import { type FrameSizing, usePlotFrame } from '../../hooks'
import { k } from '../../recipes/kata/chart'
import { formatPercent } from '../../utilities'
import { MARK_GAP, SLICE_FADE, SLICE_SETTLE, SLICE_SWEEP, TICK_CHAR_WIDTH } from './chart-constants'
import { ChartFrame } from './chart-frame'
import { type ChartAspectRatio, chartFrameSizing } from './chart-layout'
import { ChartLegend, type ChartLegendItem } from './chart-legend'
import { ChartMarksLayer } from './chart-marks-layer'
import type { ChartBaseProps, PieChartSeries } from './chart-schema'
import { formatChartValue, type SeriesPaint, seriesValues } from './chart-series'
import { useChartHover } from './context'
import { PieChartCalloutLabels } from './pie-chart/pie-chart-callout-labels'
import {
	type PieSlice,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from './pie-chart/pie-chart-geometry'
import { type PieCallouts, usePieChartCallouts } from './pie-chart/use-pie-chart-callouts'
import type { ChartReadout } from './types'
import { useChartSeriesToggle } from './use-chart-series-toggle'

/** The label switches {@link PieBaseProps.labels} accepts. */
export type PieLabels = {
	/**
	 * Percent-share label inside each slice — AG Charts' `sectorLabel`. Rendered
	 * only where it fits its slice, never clipped.
	 */
	segment?: boolean
	/**
	 * Named card outside each slice — AG Charts' `calloutLabel`. Floats the
	 * tooltip surface flush to the plot edge, centered on its sector.
	 */
	callouts?: boolean
}

/**
 * The props {@link PieChart} and {@link DonutChart} share: {@link ChartBaseProps}
 * plus the single series they slice by share and the label switches.
 *
 * @remarks Left unset, the frame reads a plain square and centers the pie in
 * it; see {@link ChartBaseProps.aspectRatio}. The legend defaults on for two or
 * more slices — the identity channel colour alone must never carry — but off
 * once callouts resolve on, since a card names every slice on its own.
 */
export type PieBaseProps<T> = ChartBaseProps<T> & {
	/**
	 * The one series to sweep: `xKey` names each slice in the legend, tooltip,
	 * and table; `yKey` holds its positive share — non-positive rows take no
	 * slice.
	 */
	series: [PieChartSeries<T>]
	/**
	 * Label switches for the plot. `segment` shows each slice's percent share at
	 * its centroid, rendered only where it fits — never clipped; the tooltip and
	 * data table always carry the full readout. `callouts` names every slice
	 * from the outside with a floating card wearing the tooltip surface, flush to
	 * the plot edge and centered on its sector — no leader — declumping per side
	 * so a crowded pie never overlaps them and shrinking the pie to make room.
	 * Unlike segment labels these name the slice, so they read without the
	 * legend.
	 *
	 * Left unset (or `{}`), the labels resolve automatically: callouts when the
	 * measured layout fits, else segment labels. Either key supersedes — set one
	 * `true` to force it (callouts then degrade by dropping the smallest shares
	 * rather than switching), set one `false` to drop it from the candidates.
	 * @defaultValue auto — labels on
	 */
	labels?: PieLabels
}

/** Props for {@link ChartPie}: the shared pie base plus the hole size and center content. @internal */
export type ChartPieProps<T> = PieBaseProps<T> & {
	/** Hole radius as a fraction of the outer radius: `0` sweeps a full pie, `> 0` a donut ring. */
	innerRatio: number
	/** Center content, rendered over a donut's hole. */
	children?: ReactNode
}

/** One placed segment label: its slice and resolved text. @internal */
type PieSegmentLabel = {
	slice: PieSlice
	text: string
}

/**
 * How the `labels` prop resolves to what may render. A key set `true` forces
 * its layer and fixes the mode; a key set `false` drops it; both unset leaves
 * the fit to decide (`forced` off) between the surviving candidates.
 *
 * @internal
 */
type ResolvedPieLabels = {
	/** Callouts may render — forced, or an auto candidate. */
	calloutCandidate: boolean
	/** Segment labels may render — forced, or an auto candidate. */
	segmentCandidate: boolean
	/** A key was set `true`, so the mode is fixed rather than fit-decided. */
	forced: boolean
}

/**
 * Resolves the label switches. Auto engages unless a key is forced `true`: with
 * neither forced, each key is a candidate unless set `false`, and the measured
 * fit picks callouts or segment labels; forcing a key fixes it and turns the
 * other off unless it too is forced. Inner keys stay `segment` / `callouts`
 * though AG Charts names them `sectorLabel` / `calloutLabel`.
 *
 * @internal
 */
function resolvePieLabels(labels: PieLabels | undefined): ResolvedPieLabels {
	const { segment, callouts } = labels ?? {}

	const forced = segment === true || callouts === true

	if (forced)
		return { calloutCandidate: callouts === true, segmentCandidate: segment === true, forced: true }

	return {
		calloutCandidate: callouts !== false,
		segmentCandidate: segment !== false,
		forced: false,
	}
}

/** A slice group's dim classes — on the wrapper, so motion's inline opacity composes. @internal */
function sliceGroupClass(emphasis: number | null, index: number): string {
	return cn('transition-opacity', emphasis !== null && emphasis !== index && 'opacity-25')
}

/**
 * When the sweep reveal reaches `mid` degrees: the moment a label's slice is
 * half uncovered, so text fades in just as its slice appears under it.
 *
 * @internal
 */
function sweepDelay(mid: number): number {
	return (mid / 360) * SLICE_SWEEP.duration
}

/** Shared shape for the static and animated segment-label renderers. @internal */
type PieSegmentLabelsProps = {
	items: PieSegmentLabel[]
	paints: SeriesPaint[]
	animate: boolean
	/** The legend-emphasised slice; other labels dim with their slices. */
	emphasis: number | null
}

/**
 * The fit-gated labels set inside the slices. Text on a mark's own fill is
 * the one place ink follows the series colour — each hue's `onFill` pick
 * clears contrast in both modes. Under `animate` a label fades in as the
 * sweep uncovers its slice.
 *
 * @internal
 */
function PieSegmentLabels({ items, paints, animate, emphasis }: PieSegmentLabelsProps) {
	return (
		<g data-slot="chart-segment-labels" pointerEvents="none">
			{items.map(({ slice, text }) => {
				const shared = {
					'data-slot': 'chart-segment-label',
					x: slice.centroid.x,
					y: slice.centroid.y,
					textAnchor: 'middle' as const,
					dominantBaseline: 'central' as const,
					className: cn('font-medium text-xs tabular-nums', paints[slice.index]?.onFill),
				}

				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
						{animate ? (
							<motion.text
								{...shared}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ ...SLICE_FADE, delay: sweepDelay(slice.mid) }}
							>
								{text}
							</motion.text>
						) : (
							<text {...shared}>{text}</text>
						)}
					</g>
				)
			})}
		</g>
	)
}

/** Options for {@link segmentLabelItems}. @internal */
type SegmentLabelOptions = {
	show: boolean
	slices: PieSlice[]
	radius: number
	innerRadius: number
}

/** Resolves and fit-gates the segment labels; empty when the switch is off. @internal */
function segmentLabelItems({
	show,
	slices,
	radius,
	innerRadius,
}: SegmentLabelOptions): PieSegmentLabel[] {
	if (!show || radius <= 0) return []

	const depth = innerRadius > 0 ? radius - innerRadius : radius

	return slices.flatMap((slice) => {
		const text = formatPercent(slice.share)

		const centroidRadius = pieCentroidRadius(radius, innerRadius, slice.share)

		const fits = segmentLabelFits(text.length, slice.share, centroidRadius, depth, TICK_CHAR_WIDTH)

		return fits ? [{ slice, text }] : []
	})
}

/** Shared shape for the static and animated slice renderers. @internal */
type PieChartMarksProps = {
	slices: PieSlice[]
	paints: SeriesPaint[]
	animate: boolean
	/** The pie center, which the sweep mask rotates about. */
	center: { x: number; y: number }
	/** The outer radius the sweep mask must cover. */
	radius: number
	/**
	 * The intro scale the slice group holds behind the sweep before contracting
	 * to `1`: `r₀ / radius` when callouts shrank the pie, else `1` (no intro).
	 */
	introScale: number
	/** The legend-emphasised slice; the others dim against it. */
	emphasis: number | null
}

/**
 * The slice paths — clean fills with no separator stroke. Slices are their own
 * hit targets: pointing one moves the shared hover index. The gap between
 * neighbours is geometric, cut into the arc angles by {@link pieSlices}, so the
 * real surface behind the chart shows through it — nothing painted to mismatch
 * a tinted or glass card.
 *
 * @remarks Under `animate` the disc wipes in clockwise from the top: a mask
 * stroke thick enough to cover the whole disc — at the intro scale too — draws
 * itself (`pathLength` 0 → 1), the same self-drawing reveal as the line chart.
 * When callouts shrank the pie, the whole slice group holds at `r₀ / radius`
 * behind the sweep, then eases to `1` about the center as the cards arrive, so
 * the pie reads as making room; the slices themselves stay static, so hover and
 * dimming behave identically mid-reveal. `ReducedMotion` strips the group
 * scale, leaving the pie at its final radius.
 * @internal
 */
function PieChartMarks({
	slices,
	paints,
	animate,
	center,
	radius,
	introScale,
	emphasis,
}: PieChartMarksProps) {
	const { set } = useChartHover()

	const sweepId = useId()

	const disc = (
		<g mask={animate ? `url(#${sweepId})` : undefined}>
			{slices.map((slice) => (
				<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
					<path
						data-slot="chart-slice"
						d={slice.d}
						className={cn(paints[slice.index]?.fill, 'hover:brightness-110')}
						onPointerEnter={() => set(slice.index, slice.centroid)}
						onPointerMove={(event: PointerEvent<SVGPathElement>) => {
							const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()

							if (!box) return

							set(slice.index, { x: event.clientX - box.left, y: event.clientY - box.top })
						}}
					/>
				</g>
			))}
		</g>
	)

	return (
		<g data-slot="chart-slices" onPointerLeave={() => set(null, null)}>
			{animate && (
				<mask id={sweepId}>
					{/* The circle's stroke starts at 3 o'clock; the group turns it to 12.
					    Its width covers the disc at the held intro scale, so the group's
					    scale never outruns the mask. */}
					<g transform={`rotate(-90 ${center.x} ${center.y})`}>
						<motion.circle
							cx={center.x}
							cy={center.y}
							r={radius / 2}
							fill="none"
							stroke="#fff"
							strokeWidth={radius * (2 * introScale - 1) + 4}
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={SLICE_SWEEP}
						/>
					</g>
				</mask>
			)}

			{animate && introScale !== 1 ? (
				<motion.g
					style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
					initial={{ scale: introScale }}
					animate={{ scale: 1 }}
					transition={SLICE_SETTLE}
				>
					{disc}
				</motion.g>
			) : (
				disc
			)}
		</g>
	)
}

/**
 * The pie frame's sizing policy: an explicit `height` or `aspectRatio` always
 * wins, resolved the same way every cartesian chart does. Left at both
 * defaults, the frame fits a plain square to its own width — the pie centers in
 * it and shrinks within to make room for any callout cards, rather than the
 * frame reserving a margin for labels it may not carry.
 *
 * @internal
 */
function pieFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio | undefined,
	margin: number,
): FrameSizing {
	if (height !== undefined || aspectRatio !== undefined) {
		return chartFrameSizing(height, aspectRatio ?? 1)
	}

	return { mode: 'content', hMargin: margin, vMargin: margin }
}

/** The values behind the slices for the tooltip and table; `null` with no rows. @internal */
function pieReadout(
	labels: string[],
	paints: SeriesPaint[],
	valueLabel: string,
	values: (number | null)[],
	format: (value: number) => string,
): ChartReadout | null {
	if (labels.length === 0) return null

	return {
		categories: labels,
		rows: [
			{
				label: valueLabel,
				swatchClass: '',
				swatchClasses: paints.map((paint) => cn(paint.text)),
				swatch: 'rect',
				values: values.map((entry) => (entry === null ? '—' : format(entry))),
			},
		],
	}
}

/**
 * The legend entries, one per row of data. A side panel's entries also carry
 * the slice's live share — re-shared over the surviving whole as slices
 * toggle, an em-dash while a slice is off or takes no slice.
 *
 * @internal
 */
function pieLegendItems(
	labels: string[],
	paints: SeriesPaint[],
	sliceValues: (number | null)[],
	panel: boolean,
): ChartLegendItem[] {
	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	return labels.map((entry, index) => {
		const value = sliceValues[index]

		const share = value != null && value > 0 && total > 0 ? formatPercent(value / total) : '—'

		return {
			label: entry,
			swatchClass: paints[index]?.text.join(' ') ?? '',
			swatch: 'rect' as const,
			detail: panel ? share : undefined,
		}
	})
}

/** Sweeps the slices at a given radius; empty at or below zero. @internal */
function pieSlicesAt(
	values: (number | null)[],
	center: { x: number; y: number },
	radius: number,
	innerRatio: number,
): PieSlice[] {
	if (radius <= 0) return []

	return pieSlices(values, {
		cx: center.x,
		cy: center.y,
		radius,
		innerRadius: radius * innerRatio,
		pad: MARK_GAP,
	})
}

/** What the resolved labels and the callout solve settle the pie's geometry to. @internal */
type PieLayout = {
	/** Whether callouts render, so the frame drops the legend and the pie shrinks. */
	showCallouts: boolean
	/** Whether the fit-gated segment labels render. */
	showSegmentLabels: boolean
	/** The radius the pie draws at. */
	radius: number
	innerRadius: number
	slices: PieSlice[]
	/** The intro group scale behind the sweep: `r₀ / radius` under a shrink, else `1`. */
	introScale: number
}

/** Options for {@link derivePieLayout}. @internal */
type PieLayoutOptions = {
	callouts: PieCallouts
	calloutCandidate: boolean
	segmentCandidate: boolean
	forced: boolean
	r0: number
	innerRatio: number
	animate: boolean
	values: (number | null)[]
	center: { x: number; y: number }
	baseSlices: PieSlice[]
}

/**
 * Reads the resolved label switches against the callout solve to fix what the
 * pie draws: whether each label layer shows, the radius (the shrunk one under
 * callouts, `r0` otherwise), the slices re-cut at it, and the intro scale.
 *
 * @internal
 */
function derivePieLayout(options: PieLayoutOptions): PieLayout {
	const { callouts, calloutCandidate, segmentCandidate, forced } = options

	const { r0, innerRatio, animate, values, center, baseSlices } = options

	const showCallouts = calloutCandidate && (forced || callouts.mode === 'callout')

	const showSegmentLabels = segmentCandidate && (forced || callouts.mode === 'sector')

	const radius = showCallouts ? callouts.radius : r0

	const slices = radius === r0 ? baseSlices : pieSlicesAt(values, center, radius, innerRatio)

	const introScale = animate && showCallouts && radius > 0 ? r0 / radius : 1

	return {
		showCallouts,
		showSegmentLabels,
		radius,
		innerRadius: radius * innerRatio,
		slices,
		introScale,
	}
}

/** Props for {@link PieOverlay}. @internal */
type PieOverlayProps = {
	callouts: PieCallouts
	animate: boolean
	emphasis: number | null
	/** A donut's center content, rendered over the hole; `null` on a pie. */
	center: ReactNode
}

/**
 * The HTML layered over the SVG inside the plot region: the callout cards and,
 * for a donut, the center content. The cards stay mounted whenever the solve
 * placed any — even in the resolved sector mode, where they render hidden — so
 * their measurement holds and the fit verdict can't flap.
 *
 * @internal
 */
function PieOverlay({ callouts, animate, emphasis, center }: PieOverlayProps) {
	if (callouts.cards.length === 0) return center

	return (
		<>
			<PieChartCalloutLabels
				cards={callouts.cards}
				maxWidth={callouts.maxWidth}
				animate={animate}
				emphasis={emphasis}
			/>

			{center}
		</>
	)
}

/**
 * The shared pie / donut engine: sweeps one dataset's positive shares into
 * slices clockwise from the top, separated by geometric gaps that show the
 * surface through, with a legend naming every slice, a per-slice hover
 * tooltip, layout-aware callout or fit-gated segment labels, and a
 * visually-hidden data table. {@link PieChart} passes `innerRatio: 0`;
 * {@link DonutChart} passes a positive ratio and center `children`.
 *
 * @internal
 */
export function ChartPie<T>({
	data,
	series,
	innerRatio,
	width,
	height,
	aspectRatio,
	legend,
	tooltip = true,
	animate = false,
	labels,
	formatValue,
	className,
	children,
	...name
}: ChartPieProps<T>) {
	const { calloutCandidate, segmentCandidate, forced } = resolvePieLabels(labels)

	const format = formatValue ?? formatChartValue

	const [entry] = series

	const values = seriesValues(data, entry.yKey)

	const sliceLabels = data.map((datum) => String(datum[entry.xKey]))

	// The frame is a plain square; callouts don't reserve a margin, the pie
	// shrinks within instead. Sized from the full dataset, so it holds still as a
	// legend entry toggles a slice — only the pie's radius reacts to that.
	const margin = MARK_GAP * 2

	const sizing = pieFrameSizing(height, aspectRatio, margin)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((entry, index) => (hidden.has(index) ? null : entry))

	const paints = values.map((_, index) => k.series[k.order[index % k.order.length] ?? 'blue'])

	const center = { x: frameWidth / 2, y: frameHeight / 2 }

	// The unshrunk radius, width- and height-bound by the square. The callout
	// solve shrinks from here; with callouts off the pie draws at it directly.
	const r0 = Math.max(0, Math.min(frameWidth / 2 - margin, frameHeight / 2 - margin))

	// Slice angles are radius-independent, so a base pass at r0 feeds the solve
	// its mids and shares before the shrunk radius is known.
	const baseSlices = pieSlicesAt(sliceValues, center, r0, innerRatio)

	const names = new Map(sliceLabels.map((label, index) => [index, label]))

	const callouts = usePieChartCallouts({
		enabled: calloutCandidate && frameWidth > 0 && baseSlices.length > 0,
		forced,
		frame: { width: frameWidth, height: frameHeight },
		center,
		r0,
		slices: baseSlices.map((slice) => ({ index: slice.index, mid: slice.mid, share: slice.share })),
		names,
	})

	const { showCallouts, showSegmentLabels, radius, innerRadius, slices, introScale } =
		derivePieLayout({
			callouts,
			calloutCandidate,
			segmentCandidate,
			forced,
			r0,
			innerRatio,
			animate,
			values: sliceValues,
			center,
			baseSlices,
		})

	const readout = pieReadout(sliceLabels, paints, entry.yName ?? entry.yKey, values, format)

	const aside = legend === 'left' || legend === 'right'

	// The legend defaults off once callouts name every slice on their own, on
	// otherwise for two or more slices; an explicit `legend` always wins.
	const showLegend = legend ?? (!showCallouts && data.length > 1)

	const legendItems = showLegend ? pieLegendItems(sliceLabels, paints, sliceValues, aside) : null

	const legendNode = legendItems ? (
		<ChartLegend
			items={legendItems}
			hidden={hidden}
			onToggle={toggle}
			onFocus={setFocus}
			panel={aside}
		/>
	) : null

	const labelItems = segmentLabelItems({ show: showSegmentLabels, slices, radius, innerRadius })

	const centerContent =
		innerRatio > 0 && children ? (
			<div
				data-slot="chart-center"
				className="pointer-events-none absolute inset-0 grid place-items-center"
			>
				{children}
			</div>
		) : null

	const marks = (
		<>
			<PieChartMarks
				slices={slices}
				paints={paints}
				animate={animate}
				center={center}
				radius={radius}
				introScale={introScale}
				emphasis={emphasis}
			/>

			{labelItems.length > 0 && (
				<PieSegmentLabels
					items={labelItems}
					paints={paints}
					animate={animate}
					emphasis={emphasis}
				/>
			)}
		</>
	)

	return (
		<ChartFrame
			{...name}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserve={reserve}
			legend={legendNode}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={readout}
			tooltip={tooltip}
			className={className}
			overlay={
				<PieOverlay
					callouts={callouts}
					animate={animate}
					emphasis={emphasis}
					center={centerContent}
				/>
			}
		>
			<ChartMarksLayer animate={animate}>{marks}</ChartMarksLayer>
		</ChartFrame>
	)
}
