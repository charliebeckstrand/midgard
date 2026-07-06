'use client'

import { motion } from 'motion/react'
import { type PointerEvent, type ReactNode, useId } from 'react'
import { cn } from '../../core'
import { type FrameSizing, usePlotFrame } from '../../hooks'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { formatPercent } from '../../utilities'
import { MARK_GAP, SLICE_FADE, SLICE_SWEEP, TICK_CHAR_WIDTH } from './chart-constants'
import { ChartFrame } from './chart-frame'
import { type ChartAspectRatio, chartFrameSizing } from './chart-layout'
import { ChartLegend, type ChartLegendItem } from './chart-legend'
import { ChartMarksLayer } from './chart-marks-layer'
import { textureClass, textureStyle, useChartTexture } from './chart-pattern-defs'
import type { ChartBaseProps, PieChartSeries } from './chart-schema'
import { formatChartValue, type SlotPaint, seriesValues } from './chart-series'
import { useChartHover } from './context'
import {
	CALLOUT_CHAR_WIDTH,
	CALLOUT_GAP,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	CALLOUT_NUB,
	type PieCallout,
	type PieCalloutFit,
	type PieSlice,
	pieCalloutFit,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from './pie-chart/pie-chart-geometry'
import type { ChartReadout } from './types'
import { useChartSeriesToggle } from './use-chart-series-toggle'

/** The label switches {@link PieBaseProps.labels} accepts. */
export type PieLabels = {
	/** @defaultValue false */
	segment?: boolean
	/** @defaultValue false */
	callouts?: boolean
}

/**
 * The props {@link PieChart} and {@link DonutChart} share: {@link ChartBaseProps}
 * plus the single series they slice by share and the label switches.
 *
 * @remarks Left unset, `aspectRatio` reads a plain pie square and fits a
 * callout-labelled one to its own content; see {@link ChartBaseProps.aspectRatio}.
 * The legend defaults on for two or more slices — the identity channel colour
 * alone must never carry.
 */
export type PieBaseProps<T> = ChartBaseProps<T> & {
	/**
	 * The one series to sweep: `xKey` names each slice in the legend, tooltip,
	 * and table; `yKey` holds its positive share — non-positive rows take no
	 * slice.
	 */
	series: [PieChartSeries<T>]
	/**
	 * Label switches for the plot. `segment` shows each slice's percent share
	 * at its centroid, rendered only where it fits — never clipped; the
	 * tooltip and data table always carry the full readout. `callouts` names
	 * every slice from the outside with a leader line to its name and percent
	 * share, declumping per side so a crowded pie never overlaps them and
	 * shrinking the pie to make room — see `aspectRatio`, the default frame
	 * shrinks with it too, rather than leaving the labels' margin empty on
	 * every side. Unlike segment labels these name the slice, so they read
	 * without the legend.
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

/** Defaults both label switches off. @internal */
function resolvePieLabels(labels: PieLabels | undefined): Required<PieLabels> {
	return { segment: labels?.segment ?? false, callouts: labels?.callouts ?? false }
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
	paints: SlotPaint[]
	animate: boolean
	/** The legend-emphasised slice; other labels dim with their slices. */
	emphasis: number | null
}

/**
 * The fit-gated labels set inside the slices. Text on a mark's own fill is
 * the one place ink follows the series colour — each hue's `onFill` pick is
 * white-first, dropping to near-black only where white can't clear the 3:1
 * graphical floor against that fill (see `kata/chart`). Under `animate` a label
 * fades in as the sweep uncovers its slice.
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
					className: cn('font-semibold text-sm tabular-nums', paints[slice.index]?.onFill),
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
	paints: SlotPaint[]
	animate: boolean
	/** The pie center, which the sweep mask rotates about. */
	center: { x: number; y: number }
	/** The outer radius the sweep mask must cover. */
	radius: number
	/** The legend-emphasised slice; the others dim against it. */
	emphasis: number | null
	/** Per-slice texture-tile fill URLs, indexed like `paints`; a flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
}

/**
 * The slice paths — clean fills with no separator stroke. The gap between
 * neighbours is geometric, cut into the arc angles by {@link pieSlices}, so the
 * real surface behind the chart shows through it — nothing painted to mismatch
 * a tinted or glass card. A gapless hit wedge behind each slice takes the
 * pointer across that channel, splitting it down the middle between the two
 * neighbours, so sweeping the gap moves the hover index rather than dropping
 * the tooltip — the way a grouped bar chart holds its readout across the gap
 * between bars. The visible slice, drawn over its wedge, still wins the pointer
 * on its own body and keeps the hover brightness.
 *
 * @remarks Under `animate` the disc wipes in clockwise from the top: a mask
 * stroke thick enough to cover the whole disc draws itself (`pathLength`
 * 0 → 1), the same self-drawing reveal as the line chart — the pie sweeps in
 * along its angular axis the way a line draws along x. The slices themselves
 * stay static, so hover and dimming behave identically mid-reveal.
 * @internal
 */
function PieChartMarks({
	slices,
	paints,
	animate,
	center,
	radius,
	emphasis,
	fills,
	textureActive = false,
}: PieChartMarksProps) {
	const { set } = useChartHover()

	const sweepId = useId()

	return (
		<g data-slot="chart-slices" onPointerLeave={() => set(null, null)}>
			{animate && (
				<mask id={sweepId}>
					{/* The circle's stroke starts at 3 o'clock; the group turns it to 12. */}
					<g transform={`rotate(-90 ${center.x} ${center.y})`}>
						<motion.circle
							cx={center.x}
							cy={center.y}
							r={radius / 2}
							fill="none"
							stroke="#fff"
							strokeWidth={radius + 4}
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={SLICE_SWEEP}
						/>
					</g>
				</mask>
			)}

			<g mask={animate ? `url(#${sweepId})` : undefined}>
				{slices.map((slice) => {
					const hover = {
						onPointerEnter: () => set(slice.index, slice.centroid),
						onPointerMove: (event: PointerEvent<SVGPathElement>) => {
							const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()

							if (!box) return

							set(slice.index, { x: event.clientX - box.left, y: event.clientY - box.top })
						},
					}

					return (
						<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
							{/* The gapless wedge sits behind the visible slice and takes the
							    pointer only where the slice recedes — its half of each channel —
							    so sweeping across the gap keeps the tooltip instead of dropping
							    it onto the bare surface. The visible slice, drawn over it, wins
							    the pointer on its own body and keeps the hover brightness. */}
							<path
								data-slot="chart-slice-hit"
								d={slice.hit}
								fill="none"
								pointerEvents="all"
								{...hover}
							/>

							<path
								data-slot="chart-slice"
								d={slice.d}
								style={textureStyle(fills?.[slice.index])}
								className={cn(
									paints[slice.index]?.fill,
									textureClass(textureActive, fills?.[slice.index]),
									'hover:brightness-110',
								)}
								{...hover}
							/>
						</g>
					)
				})}
			</g>
		</g>
	)
}

/** A placed callout with its resolved label text. @internal */
type CalloutLabel = PieCallout & { text: string }

/** What a callout's text reads: the slice name plus its percent share. @internal */
type CalloutSpec = {
	labels: string[]
}

/** One callout's text: the slice name trailed by its percent share. @internal */
function calloutLabelText({ labels }: CalloutSpec, index: number, share: number): string {
	return `${labels[index] ?? ''} ${formatPercent(share)}`.trim()
}

/** The horizontal room the widest callout needs beside the pie; the plain gap when off. @internal */
function calloutRoom(show: boolean, spec: CalloutSpec, sliceValues: (number | null)[]): number {
	if (!show) return MARK_GAP * 2

	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	const chars = sliceValues.reduce<number>(
		(widest, entry, index) =>
			entry != null && entry > 0
				? Math.max(widest, calloutLabelText(spec, index, entry / total).length)
				: widest,
		0,
	)

	return CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + chars * CALLOUT_CHAR_WIDTH
}

/** Every row's callout text, indexed like `sliceValues` — {@link pieCalloutFit}'s per-slice widths. @internal */
function calloutTexts(spec: CalloutSpec, sliceValues: (number | null)[]): string[] {
	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	return sliceValues.map((entry, index) =>
		entry != null && entry > 0 && total > 0 ? calloutLabelText(spec, index, entry / total) : '',
	)
}

/** The frame-sizing radius resolver callouts refine the content-fit height with; `undefined` when they're off. @internal */
function calloutFitRadius(
	show: boolean,
	spec: CalloutSpec,
	values: (number | null)[],
): ((width: number) => number) | undefined {
	if (!show) return undefined

	return (frameWidth) =>
		pieCalloutFit({
			values,
			texts: calloutTexts(spec, values),
			charWidth: CALLOUT_CHAR_WIDTH,
			frameWidth,
		}).radius
}

/**
 * The pie's resolved radius and center: the tight, asymmetric callout fit, or
 * — without callouts — centered at the plain gap the way every chart frame
 * defaults to.
 *
 * @internal
 */
function resolvePieFit(
	show: boolean,
	spec: CalloutSpec,
	sliceValues: (number | null)[],
	frameWidth: number,
): PieCalloutFit {
	if (!show) return { radius: frameWidth / 2 - MARK_GAP * 2, cx: frameWidth / 2 }

	return pieCalloutFit({
		values: sliceValues,
		texts: calloutTexts(spec, sliceValues),
		charWidth: CALLOUT_CHAR_WIDTH,
		frameWidth,
	})
}

/**
 * The pie frame's sizing policy: an explicit `height` or `aspectRatio` always
 * wins, resolved the same way every cartesian chart does. Left at both
 * defaults, the frame instead fits its height to the pie's own footprint —
 * twice the width-bound radius plus the vertical margin — so a wide callout
 * label never leaves an empty band the aspect ratio didn't need. `radius`
 * refines that footprint once a real width lands, to a callout-labelled
 * pie's tight, asymmetric fit rather than the flat `hMargin` every chart
 * frame otherwise falls back to.
 *
 * @internal
 */
function pieFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio | undefined,
	hMargin: number,
	vMargin: number,
	radius?: (width: number) => number,
): FrameSizing {
	if (height !== undefined || aspectRatio !== undefined) {
		return chartFrameSizing(height, aspectRatio ?? 1)
	}

	return { mode: 'content', hMargin, vMargin, radius }
}

/** Places the callouts around the pie and resolves each label's text. @internal */
function buildCallouts(
	spec: CalloutSpec,
	slices: PieSlice[],
	center: { x: number; y: number },
	radius: number,
	frameHeight: number,
): CalloutLabel[] {
	return pieCallouts(slices, {
		cx: center.x,
		cy: center.y,
		radius,
		top: CALLOUT_LINE,
		bottom: frameHeight - CALLOUT_LINE,
	}).map((placed) => {
		const slice = slices.find((entry) => entry.index === placed.index)

		return { ...placed, text: slice ? calloutLabelText(spec, placed.index, slice.share) : '' }
	})
}

/** The values behind the slices for the tooltip and table; `null` with no rows. @internal */
function pieReadout(
	labels: string[],
	paints: SlotPaint[],
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
	paints: SlotPaint[],
	colors: ChartSeriesColor[],
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
			color: colors[index],
			detail: panel ? share : undefined,
		}
	})
}

/** Props for {@link PieCallouts}. @internal */
type PieCalloutsProps = {
	items: CalloutLabel[]
	animate: boolean
	emphasis: number | null
}

/**
 * The callout labels: a muted leader from each slice out to its name and share,
 * set beside the slice. Plain SVG text on the surface — not on a fill — so it
 * takes the chrome ink and dims with its slice under legend emphasis. Under
 * `animate` each callout fades in as the sweep uncovers its slice.
 *
 * @internal
 */
function PieCallouts({ items, animate, emphasis }: PieCalloutsProps) {
	return (
		<g data-slot="chart-callouts" pointerEvents="none">
			{items.map((item) => {
				const callout = (
					<>
						<polyline
							data-slot="chart-callout-leader"
							points={item.leader}
							fill="none"
							strokeWidth={1}
							className={cn(k.axis)}
						/>

						<text
							data-slot="chart-callout-label"
							x={item.x}
							y={item.y}
							textAnchor={item.anchor}
							dominantBaseline="central"
							className={cn('font-medium', k.tick)}
						>
							{item.text}
						</text>
					</>
				)

				return (
					<g key={item.index} className={sliceGroupClass(emphasis, item.index)}>
						{animate ? (
							<motion.g
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ ...SLICE_FADE, delay: sweepDelay(item.mid) }}
							>
								{callout}
							</motion.g>
						) : (
							callout
						)}
					</g>
				)
			})}
		</g>
	)
}

/**
 * The shared pie / donut engine: sweeps one dataset's positive shares into
 * slices clockwise from the top, separated by geometric gaps that show the
 * surface through, with a legend naming every slice, a per-slice hover
 * tooltip, fit-gated segment labels, and a visually-hidden data table.
 * {@link PieChart} passes `innerRatio: 0`; {@link DonutChart} passes a positive
 * ratio and center `children`.
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
	texture = false,
	labels,
	formatValue,
	className,
	children,
	...name
}: ChartPieProps<T>) {
	const { segment: showSegmentLabels, callouts: showCallouts } = resolvePieLabels(labels)

	const format = formatValue ?? formatChartValue

	const [entry] = series

	const values = seriesValues(data, entry.yKey)

	const sliceLabels = data.map((datum) => String(datum[entry.xKey]))

	// Callouts sit outside the pie, so reserve room for the widest one and shrink
	// the pie to fit — its label never spills past the frame's clip.
	const calloutSpec: CalloutSpec = { labels: sliceLabels }

	const vMargin = showCallouts ? CALLOUT_LEADER + CALLOUT_LINE : MARK_GAP * 2

	// Sized from the full dataset rather than the toggled-visible one, so the
	// frame holds still as a legend entry hides or reveals a slice — only the
	// pie's own radius reacts to that, below.
	const sizing = pieFrameSizing(
		height,
		aspectRatio,
		calloutRoom(showCallouts, calloutSpec, values),
		vMargin,
		calloutFitRadius(showCallouts, calloutSpec, values),
	)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((entry, index) => (hidden.has(index) ? null : entry))

	const colors = values.map(
		(_, index) => (k.order[index % k.order.length] ?? 'blue') as ChartSeriesColor,
	)

	const paints = colors.map((color) => k.series[color])

	const tex = useChartTexture(texture, colors)

	const sliceFills = colors.map((color) => tex.fillFor(color))

	const pieFit = resolvePieFit(showCallouts, calloutSpec, sliceValues, frameWidth)

	const radius = Math.max(0, Math.min(pieFit.radius, frameHeight / 2 - vMargin))

	const innerRadius = radius * innerRatio

	const center = { x: pieFit.cx, y: frameHeight / 2 }

	const slices =
		radius > 0
			? pieSlices(sliceValues, { cx: center.x, cy: center.y, radius, innerRadius, pad: MARK_GAP })
			: []

	const calloutItems =
		showCallouts && radius > 0
			? buildCallouts(calloutSpec, slices, center, radius, frameHeight)
			: []

	const readout = pieReadout(sliceLabels, paints, entry.yName ?? entry.yKey, values, format)

	const aside = legend === 'left' || legend === 'right'

	const legendItems =
		(legend ?? data.length > 1)
			? pieLegendItems(sliceLabels, paints, colors, sliceValues, aside)
			: null

	const labelItems = segmentLabelItems({
		show: showSegmentLabels,
		slices,
		radius,
		innerRadius,
	})

	// Each drawn slice is one keyboard stop at its centroid — the same anchor the
	// pointer hover uses; a row with no slice (non-positive or toggled off) offers
	// none, so the arrow keys step over it.
	const focusPoints = data.map((_, index) => {
		const slice = slices.find((candidate) => candidate.index === index)

		return slice ? [slice.centroid] : []
	})

	const marks = (
		<>
			<PieChartMarks
				slices={slices}
				paints={paints}
				animate={animate}
				center={center}
				radius={radius}
				emphasis={emphasis}
				fills={sliceFills}
				textureActive={tex.active}
			/>

			{labelItems.length > 0 && (
				<PieSegmentLabels
					items={labelItems}
					paints={paints}
					animate={animate}
					emphasis={emphasis}
				/>
			)}

			{calloutItems.length > 0 && (
				<PieCallouts items={calloutItems} animate={animate} emphasis={emphasis} />
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
			legend={
				legendItems && (
					<ChartLegend
						items={legendItems}
						hidden={hidden}
						onToggle={toggle}
						onFocus={setFocus}
						panel={aside}
						texture={tex.active}
					/>
				)
			}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={readout}
			tooltip={tooltip}
			focus={{ points: focusPoints }}
			className={className}
			overlay={
				innerRatio > 0 && children ? (
					<div
						data-slot="chart-center"
						className="pointer-events-none absolute inset-0 grid place-items-center"
					>
						{children}
					</div>
				) : undefined
			}
		>
			{tex.defs}

			<ChartMarksLayer animate={animate}>{marks}</ChartMarksLayer>
		</ChartFrame>
	)
}
