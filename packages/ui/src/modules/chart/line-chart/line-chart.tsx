'use client'

import { ChartAxis } from '../chart-axis'
import { ChartCrosshair, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { nearSeriesLines, withinSeriesAreas } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import type { CartesianChartProps } from '../chart-schema'
import { snapTargets } from '../chart-snap'
import { useChartCartesian } from '../use-chart-cartesian'
import { type LineInterpolation, lineGeometry } from './line-chart-geometry'

/**
 * Props for {@link LineChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type LineChartProps<T> = CartesianChartProps<T> & {
	/**
	 * Mark every plotted point with a filled dot. Points isolated between gaps
	 * always get one — they'd be invisible otherwise.
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
 *   series={[{ xKey: 'week', yKey: 'signups', yName: 'Signups' }]}
 *   fill
 * />
 * ```
 */
export function LineChart<T>({
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
	points = false,
	fill = false,
	texture = false,
	interpolation = 'linear',
	min,
	max,
	reference,
	xAxis,
	formatValue,
	className,
	...label
}: LineChartProps<T>) {
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
			xAxis,
			formatValue,
		},
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

	const seriesRuns = list.map((series) => series.geometry.runs)

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => ({ color: meta.color, paint: meta.paint })),
	)

	const fills = chart.visible.map((meta) => tex.fillFor(meta.color))

	const marksNode = animate ? (
		<AnimatedChartLineMarks list={list} fill={fill} fills={fills} textureActive={tex.active} />
	) : (
		<ChartLineMarks list={list} fill={fill} fills={fills} textureActive={tex.active} />
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
						texture={tex.active}
					/>
				)
			}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={chart.readout}
			tooltip={tooltip}
			snap={snapTargets(rails, chart.bandPositions, chart.snapPoints)}
			count={data.length}
			bandPositions={chart.bandPositions}
			snapPoints={chart.snapPoints}
			className={className}
			annotations={<ChartReferenceList reference={reference} format={formatValue} />}
		>
			{tex.defs}

			{gridLines && chart.yScale && (
				<ChartGridLines plot={chart.plot} ticks={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={chart.snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{(tooltip || rails !== null) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					onData={(x, y) =>
						nearSeriesLines(seriesRuns, x, y) ||
						(fill && withinSeriesAreas(seriesRuns, floor, x, y))
					}
				/>
			)}

			{/* Last, over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				plot={chart.plot}
				scale={chart.yScale}
				reference={reference}
				format={formatValue}
			/>
		</ChartFrame>
	)
}
