'use client'

import { motion } from 'motion/react'
import { cn } from '../../../core'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import { k } from '../../../recipes/kata/chart'
import { ChartAxis } from '../chart-axis'
import {
	AREA_FADE,
	AREA_FILL_OPACITY,
	LINE_DRAW,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	POINT_POP,
} from '../chart-constants'
import { ChartCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import type { SeriesPaint } from '../chart-series'
import type { CartesianChartProps } from '../types'
import { useChartCartesian } from '../use-chart-cartesian'
import { type LineSeriesGeometry, lineGeometry } from './line-chart-geometry'

/**
 * Props for {@link LineChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type LineChartProps<T> = CartesianChartProps<T> & {
	/**
	 * Mark every plotted point with a filled, surface-ringed dot. Points
	 * isolated between gaps always get one — they'd be invisible otherwise.
	 * @defaultValue false
	 */
	points?: boolean
	/**
	 * Fill the region under each line with a translucent wash.
	 * @defaultValue false
	 */
	fill?: boolean
}

/** One series' render inputs, shared by the static and animated renderers. @internal */
type LineSeries = {
	label: string
	paint: SeriesPaint
	geometry: LineSeriesGeometry
	markers: boolean
}

/** Shared shape for the static and animated mark renderers. @internal */
type LineChartMarksProps = {
	list: LineSeries[]
	fill: boolean
}

/** The marker dot with its surface ring, static form. @internal */
function markerClass(paint: SeriesPaint): string {
	return cn(paint.fill, k.gap)
}

/** The plain-SVG lines: the cheap default with no motion runtime work. @internal */
function LineChartMarks({ list, fill }: LineChartMarksProps) {
	return list.map(({ label, paint, geometry, markers }) => (
		<g key={label} data-slot="chart-line-series">
			{fill &&
				geometry.areas.map((area) => (
					<path
						key={area}
						data-slot="chart-area"
						d={area}
						stroke="none"
						fillOpacity={AREA_FILL_OPACITY}
						className={cn(paint.fill)}
					/>
				))}

			{geometry.segments.map((segment) => (
				<path
					key={segment}
					data-slot="chart-line"
					d={segment}
					fill="none"
					strokeWidth={LINE_STROKE_WIDTH}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn(paint.stroke)}
				/>
			))}

			{(markers ? geometry.points : geometry.isolated).map((point) => (
				<circle
					key={`${point.x}:${point.y}`}
					data-slot="chart-point"
					cx={point.x}
					cy={point.y}
					r={MARKER_RADIUS}
					strokeWidth={MARKER_RING_WIDTH}
					className={markerClass(paint)}
				/>
			))}
		</g>
	))
}

/** The Framer Motion lines: each segment draws itself, washes and dots follow. @internal */
function AnimatedLineChartMarks({ list, fill }: LineChartMarksProps) {
	return list.map(({ label, paint, geometry, markers }) => (
		<g key={label} data-slot="chart-line-series">
			{fill &&
				geometry.areas.map((area) => (
					<motion.path
						key={area}
						data-slot="chart-area"
						d={area}
						stroke="none"
						fillOpacity={AREA_FILL_OPACITY}
						className={cn(paint.fill)}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={AREA_FADE}
					/>
				))}

			{geometry.segments.map((segment) => (
				<motion.path
					key={segment}
					data-slot="chart-line"
					d={segment}
					fill="none"
					strokeWidth={LINE_STROKE_WIDTH}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn(paint.stroke)}
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={LINE_DRAW}
				/>
			))}

			{(markers ? geometry.points : geometry.isolated).map((point) => (
				<motion.circle
					key={`${point.x}:${point.y}`}
					data-slot="chart-point"
					cx={point.x}
					cy={point.y}
					strokeWidth={MARKER_RING_WIDTH}
					className={markerClass(paint)}
					initial={{ r: 0, opacity: 0 }}
					animate={{ r: MARKER_RADIUS, opacity: 1 }}
					transition={POINT_POP}
				/>
			))}
		</g>
	))
}

/**
 * A multi-series line chart on the shared cartesian frame: 2px round-joined
 * lines that break at missing values, an optional area wash and point
 * markers, a crosshair-snapped tooltip reading every series at the pointed
 * category, and a visually-hidden data table for assistive tech.
 *
 * @remarks The value domain follows the data; pin `min` / `max` to compare
 * charts on one scale.
 * @example
 * ```tsx
 * <LineChart
 *   aria-label="Signups per week"
 *   data={weeks}
 *   x="week"
 *   series={[{ key: 'signups', label: 'Signups' }]}
 *   fill
 * />
 * ```
 */
export function LineChart<T>({
	data,
	x,
	series,
	size,
	width,
	height,
	axes = true,
	gridLines = true,
	legend,
	tooltip = true,
	animate = false,
	points = false,
	fill = false,
	min,
	max,
	formatValue,
	className,
	...label
}: LineChartProps<T>) {
	const chart = useChartCartesian(
		{ data, x, series, size, width, height, axes, legend, min, max, formatValue },
		{ zeroBaseline: false, swatch: () => 'line' },
	)

	const floor = chart.plot.y + chart.plot.height

	const yScale = chart.yScale

	const list: LineSeries[] = yScale
		? chart.metas.map((meta) => ({
				label: meta.label,
				paint: meta.paint,
				geometry: lineGeometry(
					meta.values,
					meta.values.map((_, index) => chart.band.center(index)),
					yScale.map,
					floor,
				),
				markers: points,
			}))
		: []

	const marksNode = animate ? (
		<AnimatedLineChartMarks list={list} fill={fill} />
	) : (
		<LineChartMarks list={list} fill={fill} />
	)

	return (
		<ChartFrame
			{...label}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			plot={chart.plot}
			legend={chart.legendItems}
			readout={chart.readout}
			anchors={chart.anchors}
			tooltip={tooltip}
			className={className}
		>
			{gridLines && chart.yScale && (
				<ChartGridLines plot={chart.plot} ys={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			<ChartCrosshair plot={chart.plot} xs={chart.anchors.map((anchor) => anchor.x)} />

			{animate ? <ReducedMotion>{marksNode}</ReducedMotion> : marksNode}

			{tooltip && data.length > 0 && (
				<ChartHitArea plot={chart.plot} band={chart.band} count={data.length} />
			)}
		</ChartFrame>
	)
}
