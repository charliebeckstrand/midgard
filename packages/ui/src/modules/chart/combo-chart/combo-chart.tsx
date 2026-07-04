'use client'

import { barMarks } from '../bar-chart/bar-chart-geometry'
import { ChartAxis } from '../chart-axis'
import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { MARK_GAP } from '../chart-constants'
import { ChartCrosshair, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { nearSeriesLines, withinBarMarks } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import type { CartesianFrameProps, ChartBaseProps, ComboChartSeries } from '../chart-schema'
import type { SeriesMeta } from '../chart-series'
import { snapTargets } from '../chart-snap'
import { type LineInterpolation, lineGeometry } from '../line-chart/line-chart-geometry'
import { useChartCartesian } from '../use-chart-cartesian'

/**
 * Props for {@link ComboChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type ComboChartProps<T> = ChartBaseProps<T> &
	CartesianFrameProps & {
		/** The series to plot, each drawn as bars or as a line; slot colours follow this order. */
		series: ComboChartSeries<T>[]
		/**
		 * Mark every line point with a filled, surface-ringed dot.
		 * @defaultValue true
		 */
		points?: boolean
		/**
		 * Connect the line series with straight segments or a rounded monotone curve.
		 * @defaultValue 'linear'
		 */
		interpolation?: LineInterpolation
	}

/**
 * A combined bar and line chart on one shared value axis — never a second
 * one; two measures of different scale belong on two charts. Bars render
 * behind the lines, both read the zero-baseline domain, and the frame is the
 * cartesian standard: axes, gridlines, legend, crosshair tooltip, and the
 * visually-hidden data table.
 *
 * @remarks Under `animate`, the bars rise and the lines draw together — one
 * synchronized reveal across the x and y motions.
 * @example
 * ```tsx
 * <ComboChart
 *   aria-label="Revenue and margin by quarter"
 *   data={quarters}
 *   series={[
 *     { type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
 *     { type: 'line', xKey: 'quarter', yKey: 'margin', yName: 'Margin' },
 *   ]}
 * />
 * ```
 */
export function ComboChart<T>({
	data,
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
	points = true,
	interpolation = 'linear',
	min,
	max,
	formatValue,
	className,
	...label
}: ComboChartProps<T>) {
	const chart = useChartCartesian(
		{ data, series, size, width, height, aspectRatio, axes, legend, min, max, formatValue },
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
					interpolation,
				),
				markers: points,
				dimmed: dim(meta),
			}))
		: []

	const barPaints = barMetas.map((meta) => meta.paint)

	const barDims = barMetas.map(dim)

	// Stroke the line dots wherever bars sit behind them; with the bars hidden
	// the lines stand alone and the dots need no stroke.
	const stroke = bars.length > 0

	// No line delay: the bars rise and the lines draw at once, so the x and y
	// motions land together rather than the lines waiting on the bars.
	const marksNode = animate ? (
		<>
			<AnimatedChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<AnimatedChartLineMarks list={lines} fill={false} stroke={stroke} />
		</>
	) : (
		<>
			<ChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<ChartLineMarks list={lines} fill={false} stroke={stroke} />
		</>
	)

	const rails = resolveCrosshair(crosshair)

	return (
		<ChartFrame
			{...label}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserve={chart.reserve}
			legend={
				chart.legendItems && (
					<ChartLegend
						items={chart.legendItems}
						hidden={chart.hidden}
						onToggle={chart.toggleSeries}
						onFocus={chart.setEmphasis}
						panel={legend === 'left' || legend === 'right'}
					/>
				)
			}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={chart.readout}
			tooltip={tooltip}
			snap={snapTargets(rails, chart.anchors, chart.snapPoints)}
			className={className}
		>
			{gridLines && yScale && (
				<ChartGridLines plot={chart.plot} ys={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} baseline={chart.baseline} />
			)}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandXs={chart.anchors.map((anchor) => anchor.x)}
					snapPoints={chart.snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{(tooltip || rails !== null) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					onData={(x, y) =>
						withinBarMarks(bars, x, y, MARK_GAP) ||
						nearSeriesLines(
							lines.map((series) => series.geometry.runs),
							x,
							y,
						)
					}
				/>
			)}
		</ChartFrame>
	)
}
