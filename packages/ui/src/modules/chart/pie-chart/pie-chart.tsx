'use client'

import { motion } from 'motion/react'
import type { PointerEvent, ReactNode } from 'react'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import type { AccessibleName } from '../../../types'
import { formatPercent } from '../../../utilities'
import { MARK_GAP, SLICE_FADE, SLICE_STAGGER, TICK_CHAR_WIDTH } from '../chart-constants'
import { ChartFrame } from '../chart-frame'
import { aspectReservation, type ChartAspectRatio, resolveChartHeight } from '../chart-layout'
import { ChartLegend } from '../chart-legend'
import { ChartMarksLayer } from '../chart-marks-layer'
import { formatChartValue, type SeriesPaint, seriesValues } from '../chart-series'
import { useChartHover } from '../context'
import type { ChartReadout, DataKey } from '../types'
import { useChartAnimationKey } from '../use-chart-animation-key'
import { useChartPlot } from '../use-chart-plot'
import { useChartSeriesToggle } from '../use-chart-series-toggle'
import { type PieSlice, pieCentroidRadius, pieSlices, segmentLabelFits } from './pie-chart-geometry'

/**
 * Props for {@link PieChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type PieChartProps<T> = AccessibleName & {
	/** The rows to slice, clockwise from the top. */
	data: T[]
	/** The field holding each slice's positive share; non-positive rows take no slice. */
	value: DataKey<T>
	/** The field naming each slice in the legend, tooltip, and table. */
	label: DataKey<T>
	/**
	 * Open the center into a donut; `children` render inside the hole.
	 * @defaultValue false
	 */
	donut?: boolean
	/** Frame width in px. Omitted, the chart measures its container and fills it. */
	width?: number
	/** Frame height in px; wins over `aspectRatio` when set. */
	height?: number
	/**
	 * Height as a ratio of the width — a `width / height` number, a `"1/1"`
	 * string, or `false` to fill the container's height. A pie reads best
	 * square.
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
	/** Formats tooltip and table values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	className?: string
	/** Donut center content, rendered over the hole. */
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
 * clears contrast in both modes.
 *
 * @internal
 */
function PieSegmentLabels({ items, paints, animate, emphasis }: PieSegmentLabelsProps) {
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

				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
						{animate ? (
							<motion.text
								{...shared}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ ...SLICE_FADE, delay: order * SLICE_STAGGER }}
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

	const centroidRadius = pieCentroidRadius(radius, innerRadius)

	const depth = innerRadius > 0 ? radius - innerRadius : radius

	return slices.flatMap((slice, order) => {
		const text = segmentText(kind, slice, values, labels, format)

		const fits = segmentLabelFits(text.length, slice.share, centroidRadius, depth, TICK_CHAR_WIDTH)

		return text && fits ? [{ slice, text, order }] : []
	})
}

/** Shared shape for the static and animated slice renderers. @internal */
type PieChartMarksProps = {
	slices: PieSlice[]
	paints: SeriesPaint[]
	animate: boolean
	/** The legend-emphasised slice; the others dim against it. */
	emphasis: number | null
}

/** A slice group's dim classes — on the wrapper, so motion's inline opacity composes. @internal */
function sliceGroupClass(emphasis: number | null, index: number): string {
	return cn('transition-opacity', emphasis !== null && emphasis !== index && 'opacity-25')
}

/**
 * The slice paths. Slices are their own hit targets — pointing one moves the
 * shared hover index, and the 2px surface-colour stroke keeps neighbours
 * separated at every radius.
 *
 * @remarks `paint-order: stroke` paints each slice's stroke under its own
 * fill, so the separator only shows in the gap between neighbours and never
 * bites into the solid face — the fill keeps its full radius to the arc edge.
 * @internal
 */
function PieChartMarks({ slices, paints, animate, emphasis }: PieChartMarksProps) {
	const { set } = useChartHover()

	return (
		<g data-slot="chart-slices" onPointerLeave={() => set(null, null)}>
			{slices.map((slice, order) => {
				const shared = {
					'data-slot': 'chart-slice',
					d: slice.d,
					strokeWidth: MARK_GAP * 2,
					paintOrder: 'stroke' as const,
					className: cn(paints[slice.index]?.fill, k.gap, 'hover:brightness-110'),
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
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ ...SLICE_FADE, delay: order * SLICE_STAGGER }}
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

/**
 * A pie (or donut) chart: positive shares swept clockwise from the top,
 * separated by surface-colour gaps, with a legend naming every slice, a
 * per-slice hover tooltip, and a visually-hidden data table for assistive
 * tech.
 *
 * @remarks Slice colours follow the fixed categorical slot order. Rows with
 * non-positive values take no slice but keep their true value in the table;
 * missing values show an em-dash there.
 * @example
 * ```tsx
 * <PieChart
 *   aria-label="Traffic by source"
 *   data={sources}
 *   value="visits"
 *   label="source"
 *   donut
 * >
 *   <Stat label="Total" value="12.4K" />
 * </PieChart>
 * ```
 */
export function PieChart<T>({
	data,
	value,
	label,
	donut = false,
	width,
	height,
	aspectRatio = 1,
	legend,
	tooltip = true,
	animate = false,
	segmentLabels = false,
	formatValue,
	className,
	children,
	...name
}: PieChartProps<T>) {
	const { ref, width: frameWidth, height: containerHeight } = useChartPlot(width)

	const frameHeight = resolveChartHeight(frameWidth, height, aspectRatio, containerHeight)

	const reserveAspect = aspectReservation(height, aspectRatio)

	const format = formatValue ?? formatChartValue

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const values = seriesValues(data, value)

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((entry, index) => (hidden.has(index) ? null : entry))

	const labels = data.map((datum) => String(datum[label]))

	const paints = values.map((_, index) => k.series[k.order[index % k.order.length] ?? 'blue'])

	const radius = Math.max(0, Math.min(frameWidth, frameHeight) / 2 - MARK_GAP * 2)

	const innerRadius = donut ? radius * 0.6 : 0

	const slices =
		radius > 0
			? pieSlices(sliceValues, {
					cx: frameWidth / 2,
					cy: frameHeight / 2,
					radius,
					innerRadius,
				})
			: []

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
			<PieChartMarks slices={slices} paints={paints} animate={animate} emphasis={emphasis} />

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
				donut && children ? (
					<div className="pointer-events-none absolute inset-0 grid place-items-center">
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
