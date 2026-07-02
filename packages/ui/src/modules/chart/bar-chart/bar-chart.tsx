'use client'

import { ReducedMotion } from '../../../primitives/reduced-motion'
import { ChartAxis } from '../chart-axis'
import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { ChartLegend } from '../chart-legend'
import type { CartesianChartProps } from '../types'
import { useChartCartesian } from '../use-chart-cartesian'
import { barMarks } from './bar-chart-geometry'

/**
 * Props for {@link BarChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type BarChartProps<T> = CartesianChartProps<T>

/**
 * A grouped bar chart: one band per row of `data`, one zero-baseline bar per
 * series inside it, on the shared cartesian frame — value axis with clean
 * ticks, hairline gridlines, a legend for two or more series, a hover
 * tooltip reading every series at the pointed category, and a
 * visually-hidden data table for assistive tech.
 *
 * @remarks Bars cap at the spec thickness with a rounded data end and a
 * square baseline end; negative values grow downward from the zero line.
 * @example
 * ```tsx
 * <BarChart
 *   aria-label="Revenue by quarter"
 *   data={quarters}
 *   x="quarter"
 *   series={[
 *     { key: 'revenue', label: 'Revenue' },
 *     { key: 'costs', label: 'Costs' },
 *   ]}
 * />
 * ```
 */
export function BarChart<T>({
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
	min,
	max,
	formatValue,
	className,
	...label
}: BarChartProps<T>) {
	const chart = useChartCartesian(
		{ data, x, series, size, width, height, axes, legend, min, max, formatValue },
		{ zeroBaseline: true, swatch: () => 'rect' },
	)

	const marks = chart.yScale
		? barMarks(
				chart.visible.map((meta) => meta.values),
				chart.band,
				chart.yScale.map,
				chart.baseline,
			)
		: []

	const paints = chart.visible.map((meta) => meta.paint)

	const dimmed = chart.visible.map(
		(meta) => chart.emphasis !== null && meta.index !== chart.emphasis,
	)

	const marksNode = animate ? (
		<AnimatedChartBarMarks marks={marks} paints={paints} dimmed={dimmed} />
	) : (
		<ChartBarMarks marks={marks} paints={paints} dimmed={dimmed} />
	)

	return (
		<ChartFrame
			{...label}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			plot={chart.plot}
			legend={
				chart.legendItems && (
					<ChartLegend
						items={chart.legendItems}
						hidden={chart.hidden}
						onToggle={chart.toggleSeries}
						onFocus={chart.setEmphasis}
					/>
				)
			}
			readout={chart.readout}
			tooltip={tooltip}
			className={className}
		>
			{gridLines && chart.yScale && (
				<ChartGridLines plot={chart.plot} ys={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} baseline={chart.baseline} />
			)}

			{animate ? <ReducedMotion>{marksNode}</ReducedMotion> : marksNode}

			{tooltip && data.length > 0 && (
				<ChartHitArea plot={chart.plot} band={chart.band} count={data.length} />
			)}
		</ChartFrame>
	)
}
