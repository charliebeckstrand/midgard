'use client'

import { ReducedMotion } from '../../../primitives/reduced-motion'
import type { AccessibleName } from '../../../types'
import { barMarks } from '../bar-chart/bar-chart-geometry'
import { ChartAxis } from '../chart-axis'
import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { COMBO_LINE_DELAY } from '../chart-constants'
import { ChartCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import type { SeriesMeta } from '../chart-series'
import { lineGeometry } from '../line-chart/line-chart-geometry'
import type { ComboChartSeries } from '../types'
import { type CartesianData, useChartCartesian } from '../use-chart-cartesian'

/**
 * Props for {@link ComboChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type ComboChartProps<T> = AccessibleName &
	Omit<CartesianData<T>, 'series'> & {
		/** The series to plot, each drawn as bars or as a line; slot colours follow this order. */
		series: ComboChartSeries<T>[]
		/**
		 * Mark every line point with a filled, surface-ringed dot.
		 * @defaultValue true
		 */
		points?: boolean
	}

/**
 * A combined bar and line chart on one shared value axis — never a second
 * one; two measures of different scale belong on two charts. Bars render
 * behind the lines, both read the zero-baseline domain, and the frame is the
 * cartesian standard: axes, gridlines, legend, crosshair tooltip, and the
 * visually-hidden data table.
 *
 * @remarks Under `animate`, the bars rise first and the lines hold until
 * they land, then draw themselves.
 * @example
 * ```tsx
 * <ComboChart
 *   aria-label="Revenue and margin by quarter"
 *   data={quarters}
 *   x="quarter"
 *   series={[
 *     { key: 'revenue', label: 'Revenue', type: 'bar' },
 *     { key: 'margin', label: 'Margin', type: 'line' },
 *   ]}
 * />
 * ```
 */
export function ComboChart<T>({
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
	points = true,
	min,
	max,
	formatValue,
	className,
	...label
}: ComboChartProps<T>) {
	const chart = useChartCartesian(
		{ data, x, series, size, width, height, axes, legend, min, max, formatValue },
		{
			zeroBaseline: true,
			swatch: (_, index) => (series[index]?.type === 'line' ? 'line' : 'rect'),
		},
	)

	const yScale = chart.yScale

	const dim = (meta: SeriesMeta) => chart.emphasis !== null && meta.index !== chart.emphasis

	const pick = (type: 'bar' | 'line') =>
		chart.visible.filter((meta) => (series[meta.index]?.type ?? 'bar') === type)

	const barMetas = pick('bar')

	const lineMetas = pick('line')

	const bars = yScale
		? barMarks(
				barMetas.map((meta: SeriesMeta) => meta.values),
				chart.band,
				yScale.map,
				chart.baseline,
			)
		: []

	const lines: ChartLineSeries[] = yScale
		? lineMetas.map((meta) => ({
				label: meta.label,
				paint: meta.paint,
				geometry: lineGeometry(
					meta.values,
					meta.values.map((_, index) => chart.band.center(index)),
					yScale.map,
					chart.plot.y + chart.plot.height,
				),
				markers: points,
				dimmed: dim(meta),
			}))
		: []

	const barPaints = barMetas.map((meta) => meta.paint)

	const barDims = barMetas.map(dim)

	const marksNode = animate ? (
		<>
			<AnimatedChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<AnimatedChartLineMarks list={lines} fill={false} delay={COMBO_LINE_DELAY} />
		</>
	) : (
		<>
			<ChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<ChartLineMarks list={lines} fill={false} />
		</>
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
			anchors={chart.anchors}
			tooltip={tooltip}
			className={className}
		>
			{gridLines && yScale && (
				<ChartGridLines plot={chart.plot} ys={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} baseline={chart.baseline} />
			)}

			<ChartCrosshair plot={chart.plot} xs={chart.anchors.map((anchor) => anchor.x)} />

			{animate ? <ReducedMotion>{marksNode}</ReducedMotion> : marksNode}

			{tooltip && data.length > 0 && (
				<ChartHitArea plot={chart.plot} band={chart.band} count={data.length} />
			)}
		</ChartFrame>
	)
}
