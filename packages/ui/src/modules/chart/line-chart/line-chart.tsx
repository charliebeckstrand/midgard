'use client'

import { ChartAxis } from '../chart-axis'
import { ChartCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import type { CartesianChartProps } from '../types'
import { useChartAnimationKey } from '../use-chart-animation-key'
import { useChartCartesian } from '../use-chart-cartesian'
import { type LineInterpolation, lineGeometry } from './line-chart-geometry'

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
	/**
	 * Connect points with straight segments or a rounded monotone curve that
	 * never overshoots the data.
	 * @defaultValue 'linear'
	 */
	interpolation?: LineInterpolation
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
	aspectRatio,
	axes = true,
	gridLines = true,
	legend,
	tooltip = true,
	crosshair,
	animate = false,
	points = false,
	fill = false,
	interpolation = 'linear',
	min,
	max,
	formatValue,
	className,
	...label
}: LineChartProps<T>) {
	const chart = useChartCartesian(
		{ data, x, series, size, width, height, aspectRatio, axes, legend, min, max, formatValue },
		{ zeroBaseline: false, swatch: () => 'line' },
	)

	const floor = chart.plot.y + chart.plot.height

	const yScale = chart.yScale

	const list: ChartLineSeries[] = yScale
		? chart.visible.map((meta) => ({
				label: meta.label,
				paint: meta.paint,
				geometry: lineGeometry(
					meta.values,
					meta.values.map((_, index) => chart.band.center(index)),
					yScale.map,
					floor,
					interpolation,
				),
				markers: points,
				dimmed: chart.emphasis !== null && meta.index !== chart.emphasis,
			}))
		: []

	const animationKey = useChartAnimationKey(chart.width, animate)

	const marksNode = animate ? (
		<AnimatedChartLineMarks list={list} fill={fill} />
	) : (
		<ChartLineMarks list={list} fill={fill} />
	)

	return (
		<ChartFrame
			{...label}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserveAspect={chart.reserveAspect}
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

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			{crosshair && (crosshair.x || crosshair.y) && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={crosshair}
					bandXs={chart.anchors.map((anchor) => anchor.x)}
					snapPoints={chart.snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate} generation={animationKey}>
				{marksNode}
			</ChartMarksLayer>

			{(tooltip || crosshair?.x || crosshair?.y) && data.length > 0 && (
				<ChartHitArea plot={chart.plot} band={chart.band} count={data.length} />
			)}
		</ChartFrame>
	)
}
