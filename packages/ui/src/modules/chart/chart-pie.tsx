'use client'

import { motion } from 'motion/react'
import type { PointerEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'
import { formatPercent } from '../../utilities'
import {
	MARK_GAP,
	SLICE_FADE,
	SLICE_SLIDE,
	SLICE_STAGGER,
	TICK_CHAR_WIDTH,
} from './chart-constants'
import { ChartFrame } from './chart-frame'
import { type ChartAspectRatio, resolveChartSizing } from './chart-layout'
import { ChartLegend } from './chart-legend'
import { ChartMarksLayer } from './chart-marks-layer'
import { formatChartValue, type SeriesPaint, seriesValues } from './chart-series'
import { useChartHover } from './context'
import {
	CALLOUT_GAP,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	CALLOUT_NUB,
	type PieCallout,
	type PieSlice,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from './pie-chart/pie-chart-geometry'
import type { ChartReadout, DataKey } from './types'
import { useChartAnimationKey } from './use-chart-animation-key'
import { useChartPlot } from './use-chart-plot'
import { useChartSeriesToggle } from './use-chart-series-toggle'

/**
 * The props {@link PieChart} and {@link DonutChart} share: a single dataset
 * sliced by share, with the frame's legend, tooltip, sizing, labels, and
 * animation switches. Requires an accessible name — the plot is `role="img"`.
 */
export type PieBaseProps<T> = AccessibleName & {
	/** The rows to slice, clockwise from the top. */
	data: T[]
	/** The field holding each slice's positive share; non-positive rows take no slice. */
	value: DataKey<T>
	/** The field naming each slice in the legend, tooltip, and table. */
	label: DataKey<T>
	/** Frame width in px. Omitted, the chart measures its container and fills it. */
	width?: number
	/** Frame height in px; wins over `aspectRatio` when set. */
	height?: number
	/**
	 * Height as a ratio of the width — a `width / height` number, a `"1/1"`
	 * string, or `false` to fill the container's height. Reads best square.
	 * @defaultValue 1
	 */
	aspectRatio?: ChartAspectRatio
	/**
	 * Show the legend. Defaults to on for two or more slices — the identity
	 * channel colour alone must never carry.
	 */
	legend?: boolean
	/**
	 * Show the hover tooltip naming the pointed slice.
	 * @defaultValue true
	 */
	tooltip?: boolean
	/**
	 * Animate the slices in with a clockwise stagger, honouring
	 * `prefers-reduced-motion` through the `ReducedMotion` primitive.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Label slices on the marks: `true` (or `'percent'`) shows each slice's
	 * share of the whole, `'value'` its formatted value, `'label'` its name.
	 * A label renders only where it fits at the slice's centroid — omitted,
	 * never clipped; the tooltip and data table always carry the full readout.
	 * @defaultValue false
	 */
	segmentLabels?: boolean | 'percent' | 'value' | 'label'
	/**
	 * Label every slice from the outside with a leader line to its name and
	 * share: `true` (or `'percent'`) trails the percent, `'value'` the formatted
	 * value. Labels sit beside their slices and declump per side so a crowded
	 * pie never overlaps them; the pie shrinks to make room. Unlike segment
	 * labels these name the slice, so they read without the legend.
	 * @defaultValue false
	 */
	callouts?: boolean | 'percent' | 'value'
	/** Formats tooltip and table values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	className?: string
}

/** Props for {@link ChartPie}: the shared pie base plus the hole size and center content. @internal */
export type ChartPieProps<T> = PieBaseProps<T> & {
	/** Hole radius as a fraction of the outer radius: `0` sweeps a full pie, `> 0` a donut ring. */
	innerRatio: number
	/** Center content, rendered over a donut's hole. */
	children?: ReactNode
}

/** One placed segment label: its slice, resolved text, and stagger order. @internal */
type PieSegmentLabel = {
	slice: PieSlice
	text: string
	order: number
}

/** The text a segment label shows for `slice` under the given kind. @internal */
function segmentText(
	kind: 'percent' | 'value' | 'label',
	slice: PieSlice,
	values: (number | null)[],
	labels: string[],
	format: (value: number) => string,
): string {
	if (kind === 'percent') return formatPercent(slice.share)

	if (kind === 'value') {
		const value = values[slice.index]

		return value == null ? '' : format(value)
	}

	return labels[slice.index] ?? ''
}

/** A slice group's dim classes — on the wrapper, so motion's inline opacity composes. @internal */
function sliceGroupClass(emphasis: number | null, index: number): string {
	return cn('transition-opacity', emphasis !== null && emphasis !== index && 'opacity-25')
}

/**
 * The mount reveal for one slice: it fades in while sliding out along its own
 * bisector, and the slices stagger counter-clockwise from the top. The offset
 * is a transform, so it composes with the wrapper's dim opacity untouched.
 *
 * @internal
 */
function sliceReveal(
	centroid: { x: number; y: number },
	center: { x: number; y: number },
	order: number,
	count: number,
) {
	const dx = centroid.x - center.x

	const dy = centroid.y - center.y

	const length = Math.hypot(dx, dy) || 1

	return {
		initial: { opacity: 0, x: (-dx / length) * SLICE_SLIDE, y: (-dy / length) * SLICE_SLIDE },
		animate: { opacity: 1, x: 0, y: 0 },
		transition: { ...SLICE_FADE, delay: (count - 1 - order) * SLICE_STAGGER },
	} as const
}

/** Shared shape for the static and animated segment-label renderers. @internal */
type PieSegmentLabelsProps = {
	items: PieSegmentLabel[]
	paints: SeriesPaint[]
	animate: boolean
	/** The pie center, so a label slides out with its slice on reveal. */
	center: { x: number; y: number }
	/** The total slice count, for the counter-clockwise reveal stagger. */
	count: number
	/** The legend-emphasised slice; other labels dim with their slices. */
	emphasis: number | null
}

/**
 * The fit-gated labels set inside the slices. Text on a mark's own fill is
 * the one place ink follows the series colour — each hue's `onFill` pick
 * clears contrast in both modes.
 *
 * @internal
 */
function PieSegmentLabels({
	items,
	paints,
	animate,
	center,
	count,
	emphasis,
}: PieSegmentLabelsProps) {
	return (
		<g data-slot="chart-segment-labels" pointerEvents="none">
			{items.map(({ slice, text, order }) => {
				const shared = {
					'data-slot': 'chart-segment-label',
					x: slice.centroid.x,
					y: slice.centroid.y,
					textAnchor: 'middle' as const,
					dominantBaseline: 'central' as const,
					className: cn('font-medium text-xs tabular-nums', paints[slice.index]?.onFill),
				}

				// The text keeps its x/y position attributes; the wrapping group carries
				// the reveal transform so the two never collide.
				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
						{animate ? (
							<motion.g {...sliceReveal(slice.centroid, center, order, count)}>
								<text {...shared}>{text}</text>
							</motion.g>
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
	kind: 'percent' | 'value' | 'label' | false
	slices: PieSlice[]
	values: (number | null)[]
	labels: string[]
	format: (value: number) => string
	radius: number
	innerRadius: number
}

/** Resolves and fit-gates the segment labels; empty when the prop is off. @internal */
function segmentLabelItems({
	kind,
	slices,
	values,
	labels,
	format,
	radius,
	innerRadius,
}: SegmentLabelOptions): PieSegmentLabel[] {
	if (!kind || radius <= 0) return []

	const depth = innerRadius > 0 ? radius - innerRadius : radius

	return slices.flatMap((slice, order) => {
		const text = segmentText(kind, slice, values, labels, format)

		const centroidRadius = pieCentroidRadius(radius, innerRadius, slice.share)

		const fits = segmentLabelFits(text.length, slice.share, centroidRadius, depth, TICK_CHAR_WIDTH)

		return text && fits ? [{ slice, text, order }] : []
	})
}

/** Shared shape for the static and animated slice renderers. @internal */
type PieChartMarksProps = {
	slices: PieSlice[]
	paints: SeriesPaint[]
	animate: boolean
	/** The pie center, from which slices slide out on reveal. */
	center: { x: number; y: number }
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
 * @internal
 */
function PieChartMarks({ slices, paints, animate, center, emphasis }: PieChartMarksProps) {
	const { set } = useChartHover()

	return (
		<g data-slot="chart-slices" onPointerLeave={() => set(null, null)}>
			{slices.map((slice, order) => {
				const shared = {
					'data-slot': 'chart-slice',
					d: slice.d,
					className: cn(paints[slice.index]?.fill, 'hover:brightness-110'),
					onPointerEnter: () => set(slice.index, slice.centroid),
					onPointerMove: (event: PointerEvent<SVGPathElement>) => {
						const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()

						if (!box) return

						set(slice.index, { x: event.clientX - box.left, y: event.clientY - box.top })
					},
				}

				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
						{animate ? (
							<motion.path
								{...shared}
								{...sliceReveal(slice.centroid, center, order, slices.length)}
							/>
						) : (
							<path {...shared} />
						)}
					</g>
				)
			})}
		</g>
	)
}

/** A placed callout with its resolved label text. @internal */
type CalloutLabel = PieCallout & { text: string }

/** What a callout's text reads: the slice name plus its share or formatted value. @internal */
type CalloutSpec = {
	kind: boolean | 'percent' | 'value'
	labels: string[]
	values: (number | null)[]
	format: (value: number) => string
}

/** One callout's text: the slice name trailed by its share, or its formatted value. @internal */
function calloutLabelText(
	{ kind, labels, values, format }: CalloutSpec,
	index: number,
	share: number,
): string {
	const entry = values[index]

	const suffix = kind === 'value' ? (entry == null ? '' : format(entry)) : formatPercent(share)

	return `${labels[index] ?? ''} ${suffix}`.trim()
}

/** The horizontal room the widest callout needs beside the pie; the plain gap when off. @internal */
function calloutRoom(spec: CalloutSpec, sliceValues: (number | null)[]): number {
	if (!spec.kind) return MARK_GAP * 2

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

	return CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + chars * TICK_CHAR_WIDTH
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

/**
 * The callout labels: a muted leader from each slice out to its name and share,
 * set beside the slice. Plain SVG text on the surface — not on a fill — so it
 * takes the chrome ink and dims with its slice under legend emphasis.
 *
 * @internal
 */
function PieCallouts({ items, emphasis }: { items: CalloutLabel[]; emphasis: number | null }) {
	return (
		<g data-slot="chart-callouts" pointerEvents="none">
			{items.map((item) => (
				<g key={item.index} className={sliceGroupClass(emphasis, item.index)}>
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
				</g>
			))}
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
	value,
	label,
	innerRatio,
	width,
	height,
	aspectRatio = 1,
	legend,
	tooltip = true,
	animate = false,
	segmentLabels = false,
	callouts = false,
	formatValue,
	className,
	children,
	...name
}: ChartPieProps<T>) {
	const { ref, width: frameWidth, height: containerHeight } = useChartPlot(width)

	const { height: frameHeight, reserveAspect } = resolveChartSizing(
		frameWidth,
		height,
		aspectRatio,
		containerHeight,
	)

	const format = formatValue ?? formatChartValue

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const values = seriesValues(data, value)

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((entry, index) => (hidden.has(index) ? null : entry))

	const labels = data.map((datum) => String(datum[label]))

	const paints = values.map((_, index) => k.series[k.order[index % k.order.length] ?? 'blue'])

	// Callouts sit outside the pie, so reserve room for the widest one and shrink
	// the pie to fit — its label never spills past the frame's clip.
	const text = { kind: callouts, labels, values, format } as const

	const hMargin = calloutRoom(text, sliceValues)

	const vMargin = callouts ? CALLOUT_LEADER + CALLOUT_LINE : MARK_GAP * 2

	const radius = Math.max(0, Math.min(frameWidth / 2 - hMargin, frameHeight / 2 - vMargin))

	const innerRadius = radius * innerRatio

	const center = { x: frameWidth / 2, y: frameHeight / 2 }

	const slices =
		radius > 0
			? pieSlices(sliceValues, { cx: center.x, cy: center.y, radius, innerRadius, pad: MARK_GAP })
			: []

	const calloutItems =
		callouts && radius > 0 ? buildCallouts(text, slices, center, radius, frameHeight) : []

	const readout: ChartReadout | null =
		data.length > 0
			? {
					categories: labels,
					rows: [
						{
							label: String(value),
							swatchClass: '',
							swatchClasses: paints.map((paint) => cn(paint.bg)),
							swatch: 'rect',
							values: values.map((entry) => (entry === null ? '—' : format(entry))),
						},
					],
				}
			: null

	const legendItems =
		(legend ?? data.length > 1)
			? labels.map((entry, index) => ({
					label: entry,
					swatchClass: paints[index]?.bg.join(' ') ?? '',
					swatch: 'rect' as const,
				}))
			: null

	const labelItems = segmentLabelItems({
		kind: segmentLabels === true ? 'percent' : segmentLabels,
		slices,
		values,
		labels,
		format,
		radius,
		innerRadius,
	})

	const animationKey = useChartAnimationKey(frameWidth, animate)

	const marks = (
		<>
			<PieChartMarks
				slices={slices}
				paints={paints}
				animate={animate}
				center={center}
				emphasis={emphasis}
			/>

			{labelItems.length > 0 && (
				<PieSegmentLabels
					items={labelItems}
					paints={paints}
					animate={animate}
					center={center}
					count={slices.length}
					emphasis={emphasis}
				/>
			)}

			{calloutItems.length > 0 && <PieCallouts items={calloutItems} emphasis={emphasis} />}
		</>
	)

	return (
		<ChartFrame
			{...name}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserveAspect={reserveAspect}
			plot={{ x: 0, y: 0, width: frameWidth, height: frameHeight }}
			legend={
				legendItems && (
					<ChartLegend items={legendItems} hidden={hidden} onToggle={toggle} onFocus={setFocus} />
				)
			}
			readout={readout}
			tooltip={tooltip}
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
			<ChartMarksLayer animate={animate} generation={animationKey}>
				{marks}
			</ChartMarksLayer>
		</ChartFrame>
	)
}
