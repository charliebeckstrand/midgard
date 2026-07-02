'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../../core'
import { useResolvedSize } from '../../../primitives/density'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import type { Step } from '../../../recipes'
import { k } from '../../../recipes/kata/chart'
import type { AccessibleName } from '../../../types'
import { CHART_METRICS, MARK_GAP, SLICE_FADE, SLICE_STAGGER } from '../chart-constants'
import { ChartFrame } from '../chart-frame'
import { formatChartValue, type SeriesPaint, seriesValues } from '../chart-series'
import { useChartHover } from '../context'
import type { ChartReadout, DataKey } from '../types'
import { useChartPlot } from '../use-chart-plot'
import { type PieSlice, pieSlices } from './pie-chart-geometry'

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
	/** Resolves against enclosing Density; sets the default frame height. */
	size?: Step
	/** Frame width in px. Omitted, the chart measures its container and fills it. */
	width?: number
	/** Frame height in px; overrides the density default. */
	height?: number
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
	/** Formats tooltip and table values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	className?: string
	/** Donut center content, rendered over the hole. */
	children?: ReactNode
}

/** Shared shape for the static and animated slice renderers. @internal */
type PieChartMarksProps = {
	slices: PieSlice[]
	paints: SeriesPaint[]
	animate: boolean
}

/**
 * The slice paths. Slices are their own hit targets — pointing one moves the
 * shared hover index, and the 2px surface-colour stroke keeps neighbours
 * separated at every radius.
 *
 * @internal
 */
function PieChartMarks({ slices, paints, animate }: PieChartMarksProps) {
	const { setIndex } = useChartHover()

	return (
		<g data-slot="chart-slices" onPointerLeave={() => setIndex(null)}>
			{slices.map((slice, order) => {
				const shared = {
					'data-slot': 'chart-slice',
					d: slice.d,
					strokeWidth: MARK_GAP,
					className: cn(paints[slice.index]?.fill, k.gap, 'hover:brightness-110'),
					onPointerEnter: () => setIndex(slice.index),
				}

				return animate ? (
					<motion.path
						key={slice.index}
						{...shared}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ ...SLICE_FADE, delay: order * SLICE_STAGGER }}
					/>
				) : (
					<path key={slice.index} {...shared} />
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
	size,
	width,
	height,
	legend,
	tooltip = true,
	animate = false,
	formatValue,
	className,
	children,
	...name
}: PieChartProps<T>) {
	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	const { ref, width: frameWidth } = useChartPlot(width)

	const frameHeight = height ?? metrics.height

	const format = formatValue ?? formatChartValue

	const values = seriesValues(data, value)

	const labels = data.map((datum) => String(datum[label]))

	const paints = values.map((_, index) => k.series[k.order[index % k.order.length] ?? 'blue'])

	const radius = Math.max(0, Math.min(frameWidth, frameHeight) / 2 - MARK_GAP * 2)

	const slices =
		radius > 0
			? pieSlices(values, {
					cx: frameWidth / 2,
					cy: frameHeight / 2,
					radius,
					innerRadius: donut ? radius * 0.6 : 0,
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

	const anchors = data.map((_, index) => {
		const slice = slices.find((candidate) => candidate.index === index)

		return slice ? slice.centroid : { x: frameWidth / 2, y: frameHeight / 2 }
	})

	const marks = <PieChartMarks slices={slices} paints={paints} animate={animate} />

	return (
		<ChartFrame
			{...name}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			plot={{ x: 0, y: 0, width: frameWidth, height: frameHeight }}
			legend={legendItems}
			readout={readout}
			anchors={anchors}
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
			{animate ? <ReducedMotion>{marks}</ReducedMotion> : marks}
		</ChartFrame>
	)
}
