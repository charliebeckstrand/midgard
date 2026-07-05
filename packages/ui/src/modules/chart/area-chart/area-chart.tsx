'use client'

import { ChartAxis } from '../chart-axis'
import { ChartCrosshair, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { withinSeriesAreas } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import type { CartesianChartProps, Crosshair } from '../chart-schema'
import type { SeriesMeta } from '../chart-series'
import { snapTargets } from '../chart-snap'
import {
	type LineInterpolation,
	type LineSeriesGeometry,
	lineGeometry,
} from '../line-chart/line-chart-geometry'
import { useChartCartesian } from '../use-chart-cartesian'
import { stackedAreas } from './area-chart-geometry'

/**
 * Props for {@link AreaChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type AreaChartProps<T> = CartesianChartProps<T> & {
	/**
	 * Draw a hover crosshair. Alone among the cartesian charts this defaults on:
	 * a snapping vertical category rule (`{ y: true, snap: true }`) that meets the
	 * nearest band-edge point and carries the tooltip there. Smooth interpolation
	 * drops the snap so the rule and tooltip track the pointer along the curve
	 * between points. Pass `true`, a {@link Crosshair} object, or `false` to
	 * override the default.
	 * @defaultValue a snapping y-rule, unsnapped when `interpolation` is `'smooth'`
	 */
	crosshair?: boolean | Crosshair
	/**
	 * Stack the series so each rides the running total below it and the fills
	 * read as parts of a whole; otherwise each is its own area from the zero
	 * baseline, washes overlapping.
	 * @defaultValue false
	 */
	stacked?: boolean
	/**
	 * Mark every band-edge point with a filled dot.
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

/**
 * The tooltip's value snap targets. Stacked, a column reads as one whole with
 * no single series value to meet, so it hands over none — the tooltip then
 * tracks the pointer's height (held inside the plot by the hit area) and floats
 * free of the fill. Unstacked, each series is its own line, so its per-series
 * points snap the tooltip to the nearest one.
 *
 * @internal
 */
function tooltipSnapPoints(stacked: boolean, snapPoints: number[][], count: number): number[][] {
	return stacked ? Array.from({ length: count }, () => []) : snapPoints
}

/** Adapts one stacked band to the line-marks geometry shape (one segment, one ribbon). @internal */
function stackedToLine(band: { line: string; area: string; points: LineSeriesGeometry['points'] }) {
	return {
		segments: band.line ? [band.line] : [],
		areas: band.area ? [band.area] : [],
		points: band.points,
		runs: band.points.length > 0 ? [band.points] : [],
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
 * the unstacked variant breaks its lines at gaps like {@link LineChart}. The
 * crosshair defaults on here — a snapping y-rule meeting the nearest point —
 * dropping the snap under smooth interpolation; override it with the
 * `crosshair` prop.
 * @example
 * ```tsx
 * <AreaChart
 *   aria-label="Traffic by channel"
 *   data={days}
 *   series={[
 *     { xKey: 'day', yKey: 'organic', yName: 'Organic' },
 *     { xKey: 'day', yKey: 'paid', yName: 'Paid' },
 *   ]}
 *   stacked
 * />
 * ```
 */
export function AreaChart<T>({
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
	stacked = false,
	texture = false,
	points = false,
	interpolation = 'linear',
	min,
	max,
	reference,
	xAxis,
	formatValue,
	className,
	...label
}: AreaChartProps<T>) {
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

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => ({ color: meta.color, paint: meta.paint })),
	)

	const fills = chart.visible.map((meta) => tex.fillFor(meta.color))

	const marksNode = animate ? (
		<AnimatedChartLineMarks list={list} fill={true} fills={fills} textureActive={tex.active} />
	) : (
		<ChartLineMarks list={list} fill={true} fills={fills} textureActive={tex.active} />
	)

	// The area chart carries a snapping y-rule by default so the fills read
	// against a category line; a smooth curve drops the snap to glide the rule
	// and tooltip along the interpolation rather than jumping between points.
	const rails = resolveCrosshair(
		crosshair ?? { x: false, y: true, snap: interpolation !== 'smooth' },
	)

	const snapPoints = tooltipSnapPoints(stacked, chart.snapPoints, xs.length)

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
			snap={snapTargets(rails, chart.bandPositions, snapPoints)}
			count={data.length}
			bandPositions={chart.bandPositions}
			snapPoints={chart.snapPoints}
			className={className}
			annotations={<ChartReferenceList reference={reference} format={formatValue} />}
		>
			{tex.defs}

			{gridLines && yScale && (
				<ChartGridLines plot={chart.plot} ticks={chart.yTicks.map((tick) => tick.at)} />
			)}

			{axes && yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{(tooltip || rails !== null) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					onData={(x, y) =>
						withinSeriesAreas(
							list.map((series) => series.geometry.runs),
							floor,
							x,
							y,
						)
					}
				/>
			)}

			{/* Last, over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				plot={chart.plot}
				scale={yScale}
				reference={reference}
				format={formatValue}
			/>
		</ChartFrame>
	)
}
