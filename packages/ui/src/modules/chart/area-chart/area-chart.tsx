'use client'

import { ChartAxis } from '../chart-axis'
import { ChartCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartGuideLine } from '../chart-guide-line'
import { ChartHitArea } from '../chart-hit-area'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import type { SeriesMeta } from '../chart-series'
import {
	type LineInterpolation,
	type LineSeriesGeometry,
	lineGeometry,
} from '../line-chart/line-chart-geometry'
import type { CartesianChartProps } from '../types'
import { useChartAnimationKey } from '../use-chart-animation-key'
import { useChartCartesian } from '../use-chart-cartesian'
import { stackedAreas } from './area-chart-geometry'

/**
 * Props for {@link AreaChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type AreaChartProps<T> = CartesianChartProps<T> & {
	/**
	 * Stack the series so each rides the running total below it and the fills
	 * read as parts of a whole; otherwise each is its own area from the zero
	 * baseline, washes overlapping.
	 * @defaultValue false
	 */
	stacked?: boolean
	/**
	 * Mark every band-edge point with a filled, surface-ringed dot.
	 * @defaultValue false
	 */
	points?: boolean
	/**
	 * Connect points with straight segments or a rounded monotone curve.
	 * Applies to the unstacked variant.
	 * @defaultValue 'linear'
	 */
	interpolation?: LineInterpolation
}

/** Adapts one stacked band to the line-marks geometry shape (one segment, one ribbon). @internal */
function stackedToLine(band: { line: string; area: string; points: LineSeriesGeometry['points'] }) {
	return {
		segments: band.line ? [band.line] : [],
		areas: band.area ? [band.area] : [],
		points: band.points,
		isolated: [],
	}
}

/**
 * A filled area chart on the shared cartesian frame: each series is a wash
 * under its band-edge line, stacked into a part-to-whole ribbon set or left
 * as independent overlapping areas. Carries the cartesian standard — value
 * axis, gridlines, legend, crosshair tooltip, and the visually-hidden table.
 *
 * @remarks Stacked bands treat a missing value as zero to stay continuous;
 * the unstacked variant breaks its lines at gaps like {@link LineChart}.
 * @example
 * ```tsx
 * <AreaChart
 *   aria-label="Traffic by channel"
 *   data={days}
 *   x="day"
 *   series={[
 *     { key: 'organic', label: 'Organic' },
 *     { key: 'paid', label: 'Paid' },
 *   ]}
 *   stacked
 * />
 * ```
 */
export function AreaChart<T>({
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
	guideLine,
	animate = false,
	stacked = false,
	points = false,
	interpolation = 'linear',
	min,
	max,
	formatValue,
	className,
	...label
}: AreaChartProps<T>) {
	const chart = useChartCartesian(
		{ data, x, series, size, width, height, aspectRatio, axes, legend, min, max, formatValue },
		{ zeroBaseline: true, swatch: () => 'line', stack: stacked },
	)

	const yScale = chart.yScale

	const floor = chart.plot.y + chart.plot.height

	const xs = chart.metas[0]?.values.map((_, index) => chart.band.center(index)) ?? []

	const dimmed = (meta: SeriesMeta) => chart.emphasis !== null && meta.index !== chart.emphasis

	const stackedGeometry =
		yScale && stacked
			? stackedAreas(
					chart.visible.map((meta) => meta.values),
					xs,
					yScale.map,
				)
			: []

	const list: ChartLineSeries[] = yScale
		? chart.visible.map((meta, order) => ({
				label: meta.label,
				paint: meta.paint,
				geometry: stacked
					? stackedToLine(stackedGeometry[order] ?? { line: '', area: '', points: [] })
					: lineGeometry(
							meta.values,
							meta.values.map((_, index) => chart.band.center(index)),
							yScale.map,
							floor,
							interpolation,
						),
				markers: points,
				dimmed: dimmed(meta),
			}))
		: []

	const animationKey = useChartAnimationKey(chart.width, animate)

	const marksNode = animate ? (
		<AnimatedChartLineMarks list={list} fill={true} />
	) : (
		<ChartLineMarks list={list} fill={true} />
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
			{gridLines && yScale && (
				<ChartGridLines plot={chart.plot} ys={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			{guideLine?.y && (
				<ChartCrosshair plot={chart.plot} xs={chart.anchors.map((anchor) => anchor.x)} />
			)}

			{guideLine?.x && yScale && <ChartGuideLine plot={chart.plot} />}

			<ChartMarksLayer animate={animate} generation={animationKey}>
				{marksNode}
			</ChartMarksLayer>

			{(tooltip || guideLine?.x || guideLine?.y) && data.length > 0 && (
				<ChartHitArea plot={chart.plot} band={chart.band} count={data.length} />
			)}
		</ChartFrame>
	)
}
