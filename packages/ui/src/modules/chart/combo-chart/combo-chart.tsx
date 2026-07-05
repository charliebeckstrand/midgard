'use client'

import { barMarks } from '../bar-chart/bar-chart-geometry'
import { ChartAxis } from '../chart-axis'
import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { MARK_GAP } from '../chart-constants'
import { ChartCrosshair, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { nearSeriesLines, withinBarMarks, withinSeriesAreas } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { ChartReferenceLines } from '../chart-reference-lines'
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
		/** The series to plot, each drawn as bars, a line, or a filled area; slot colours follow this order. */
		series: ComboChartSeries<T>[]
		/**
		 * Mark every line and area point with a filled, surface-ringed dot.
		 * @defaultValue true
		 */
		points?: boolean
		/**
		 * Connect the line and area series with straight segments or a rounded
		 * monotone curve.
		 * @defaultValue 'linear'
		 */
		interpolation?: LineInterpolation
	}

/**
 * A combined bar, line, and area chart on one shared value axis — never a
 * second one; two measures of different scale belong on two charts. Bars sit
 * at the back, the translucent area washes ride over them, and lines draw on
 * top; every series reads the zero-baseline domain, and the frame is the
 * cartesian standard: axes, gridlines, legend, crosshair tooltip, and the
 * visually-hidden data table.
 *
 * @remarks Under `animate`, the bars rise, the area washes fade, and the lines
 * draw together — one synchronized reveal across the x and y motions.
 * @example
 * ```tsx
 * <ComboChart
 *   aria-label="Revenue, cost, and margin by quarter"
 *   data={quarters}
 *   series={[
 *     { type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
 *     { type: 'area', xKey: 'quarter', yKey: 'cost', yName: 'Cost' },
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
	reference,
	formatValue,
	className,
	...label
}: ComboChartProps<T>) {
	const chart = useChartCartesian(
		{
			data,
			series,
			size,
			width,
			height,
			aspectRatio,
			axes,
			legend,
			min,
			max,
			reference,
			formatValue,
		},
		{
			zeroBaseline: true,
			swatch: (_, index) => (series[index]?.type === 'bar' ? 'rect' : 'line'),
		},
	)

	const yScale = chart.yScale

	const floor = chart.plot.y + chart.plot.height

	const dim = (meta: SeriesMeta) => chart.emphasis !== null && meta.index !== chart.emphasis

	const pick = (type: ComboChartSeries<T>['type']) =>
		chart.visible.filter((meta) => (series[meta.index]?.type ?? 'bar') === type)

	const barMetas = pick('bar')

	const lineMetas = pick('line')

	const areaMetas = pick('area')

	const bars = yScale
		? barMarks(
				barMetas.map((meta: SeriesMeta) => meta.values),
				chart.band,
				yScale.map,
				chart.baseline,
			)
		: []

	// Lines and areas share the polyline geometry; an area is a line that also
	// fills down to the baseline.
	const toSeries = (metas: SeriesMeta[]): ChartLineSeries[] =>
		yScale
			? metas.map((meta) => ({
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
					dimmed: dim(meta),
				}))
			: []

	const lines = toSeries(lineMetas)

	const areas = toSeries(areaMetas)

	const barPaints = barMetas.map((meta) => meta.paint)

	const barDims = barMetas.map(dim)

	// Stroke the line and area dots wherever bars sit behind them; with the bars
	// hidden the curves stand alone and the dots need no stroke.
	const stroke = bars.length > 0

	// No line delay: the bars rise and the lines draw at once, so the x and y
	// motions land together rather than the lines waiting on the bars. Bars sit
	// at the back, then the translucent area washes over them — a wash behind
	// opaque bars would vanish wherever the area falls short of them — then the
	// lines ride on top.
	const marksNode = animate ? (
		<>
			<AnimatedChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<AnimatedChartLineMarks list={areas} fill={true} stroke={stroke} />

			<AnimatedChartLineMarks list={lines} fill={false} stroke={stroke} />
		</>
	) : (
		<>
			<ChartBarMarks marks={bars} paints={barPaints} dimmed={barDims} />

			<ChartLineMarks list={areas} fill={true} stroke={stroke} />

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
			snap={snapTargets(rails, chart.bandPositions, chart.snapPoints)}
			className={className}
		>
			{gridLines && yScale && (
				<ChartGridLines plot={chart.plot} ticks={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} baseline={chart.baseline} />
			)}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={chart.snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			<ChartReferenceLines plot={chart.plot} scale={yScale} reference={reference} />

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
						) ||
						withinSeriesAreas(
							areas.map((series) => series.geometry.runs),
							floor,
							x,
							y,
						)
					}
				/>
			)}
		</ChartFrame>
	)
}
