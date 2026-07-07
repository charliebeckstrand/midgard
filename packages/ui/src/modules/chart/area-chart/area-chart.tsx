'use client'

import { ChartAxis, ChartAxisTitles } from '../chart-axis'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { withinSeriesAreas } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import {
	type CartesianChartProps,
	type ChartValueLabelConfig,
	type Crosshair,
	resolveTooltip,
} from '../chart-schema'
import type { SeriesMeta } from '../chart-series'
import { snapTargets } from '../chart-snap'
import { ChartValueLabels, resolveValueLabels } from '../chart-value-labels'
import {
	type LineInterpolation,
	type LineSeriesGeometry,
	lineGeometry,
} from '../line-chart/line-chart-geometry'
import {
	bandCenters,
	type DrawnSeries,
	drawnSeries,
	useChartCartesian,
} from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
import { type StackedAreaGeometry, stackedAreas } from './area-chart-geometry'

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
	/**
	 * Draw selective value labels — each series' `endpoints` and / or `extremes`
	 * — on its band-edge line, overlaps dropped by priority, and, with
	 * `references`, each reference rule's value beside it in place of its hover
	 * tooltip. Off by default; the tooltip and data table carry the full readout.
	 */
	labels?: ChartValueLabelConfig
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

/**
 * The value points keyboard navigation anchors to. Unstacked, they are the
 * per-series points the pointer snaps to. Stacked, the pointer floats free but
 * the keyboard still needs a stop per band, so each category hands over its
 * ribbons' cumulative top edges — the boundaries the eye already reads — top to
 * bottom of the stack.
 *
 * @internal
 */
function focusPoints(
	stacked: boolean,
	snapPoints: number[][],
	bands: StackedAreaGeometry[],
	count: number,
): number[][] {
	if (!stacked) return snapPoints

	return Array.from({ length: count }, (_, index) =>
		bands.reduce<number[]>((ys, band) => {
			const y = band.points[index]?.y

			if (y != null && Number.isFinite(y)) ys.push(y)

			return ys
		}, []),
	)
}

/**
 * The reference lines' keyboard stops, or none when `labels.references` draws
 * their values beside them instead: a labelled rule reads its value without the
 * rove, so it leaves the value-axis roving the way it leaves the hover tooltip.
 *
 * @internal
 */
function referenceStops(
	labels: ChartValueLabelConfig | undefined,
	positions: (number | null)[],
): (number | null)[] | undefined {
	return labels?.references ? undefined : positions
}

/**
 * The series index behind each keyboard stop, aligned to {@link focusPoints} so
 * the cursor's value lane resolves to the series it reads. Unstacked, the stops
 * are the per-series snap points, so the cartesian series map carries straight
 * through. Stacked, each stop is a ribbon's top edge, so the drawn series behind
 * that ribbon names it — dropped by the same finite-edge gate the points use, so
 * the two stay in step.
 *
 * @internal
 */
function focusSeries(
	stacked: boolean,
	snapSeries: number[][],
	drawn: DrawnSeries[],
	bands: StackedAreaGeometry[],
	count: number,
): number[][] {
	if (!stacked) return snapSeries

	return Array.from({ length: count }, (_, index) =>
		bands.reduce<number[]>((series, band, order) => {
			const y = band.points[index]?.y

			const meta = drawn[order]?.meta

			if (meta && y != null && Number.isFinite(y)) series.push(meta.index)

			return series
		}, []),
	)
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

/** One drawn series' geometry: its stacked ribbon, or its own line through its axis's scale. @internal */
function areaGeometry(
	entry: DrawnSeries,
	order: number,
	args: {
		stacked: boolean
		stackedGeometry: StackedAreaGeometry[]
		centers: number[]
		interpolation: LineInterpolation
	},
): LineSeriesGeometry {
	if (args.stacked) {
		return stackedToLine(args.stackedGeometry[order] ?? { line: '', area: '', points: [] })
	}

	// The wash closes to the series' own zero baseline, not the plot floor: on a
	// zero-baseline scale the two coincide for all-positive data, but a negative
	// value (or a domain pinned below zero) lifts zero off the floor, and the fill
	// reads to that zero the way the stacked ribbon bottoms at it.
	return lineGeometry(
		entry.meta.values,
		args.centers,
		entry.scale.map,
		entry.baseline,
		args.interpolation,
	)
}

/** The stacked ribbons through the stack's one scale; empty unstacked or before it resolves. @internal */
function stackedRibbons(
	drawn: DrawnSeries[],
	xs: number[],
	stacked: boolean,
): StackedAreaGeometry[] {
	const scale = drawn[0]?.scale

	return stacked && scale
		? stackedAreas(
				drawn.map(({ meta }) => meta.values),
				xs,
				scale.map,
			)
		: []
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
 * `crosshair` prop. Focus the plot to drive the crosshair and tooltip by
 * keyboard — the band-axis arrows step categories, the value-axis arrows step
 * each category's points in screen order (a stack's cumulative band edges when
 * stacked, each series' own point otherwise). A reference line joins that
 * value-axis roving, receding the marks when the cursor reaches it — unless
 * `labels.references` draws its value beside it, which stands in for the hover
 * and drops the rove.
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
	tooltip,
	crosshair,
	animate = false,
	stacked = false,
	texture = false,
	points = false,
	interpolation = 'linear',
	min,
	max,
	leftAxis,
	rightAxis,
	reference,
	xAxis,
	tickRotation,
	labels,
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
			leftAxis,
			rightAxis,
			reference,
			xAxis,
			tickRotation,
			formatValue,
		},
		{ zeroBaseline: true, swatch: () => 'line', stack: stacked },
	)

	const floor = chart.plot.y + chart.plot.height

	const xs = bandCenters(chart)

	const dimmed = (meta: SeriesMeta) => chart.emphasis !== null && meta.index !== chart.emphasis

	// A stack binds to one axis (the side its series agree on, else the left),
	// so its ribbons read that one scale; unstacked series each read their own.
	const drawn = drawnSeries(chart)

	const stackedGeometry = stackedRibbons(drawn, xs, stacked)

	const list: ChartLineSeries[] = drawn.map((entry, order) => ({
		index: entry.meta.index,
		label: entry.meta.label,
		paint: entry.meta.paint,
		geometry: areaGeometry(entry, order, {
			stacked,
			stackedGeometry,
			centers: xs,
			interpolation,
		}),
		markers: points,
		dimmed: dimmed(entry.meta),
		dashed: entry.meta.dashed,
	}))

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => meta.slot),
	)

	const fills = drawn.map(({ meta }) => tex.fillFor(meta.slot))

	const valueLabelItems = resolveValueLabels(
		labels,
		list,
		drawn.map(({ meta }) => meta),
		chart.plot,
		formatValue,
		drawn.map(
			({ meta }) =>
				(value: number) =>
					chart.formatAxisValue(value, meta.axis),
		),
		// Stacked ribbons carry a top-edge point per category (nulls included), not
		// the gap-skipped points a line's geometry emits, so the labels read each
		// category's value by index rather than zipping the gap-filtered values.
		!stacked,
	)

	const marksNode = animate ? (
		<AnimatedChartLineMarks
			list={list}
			fill={true}
			fills={fills}
			textureActive={tex.active}
			plot={chart.plot}
		/>
	) : (
		<ChartLineMarks list={list} fill={true} fills={fills} textureActive={tex.active} />
	)

	// The area chart carries a snapping y-rule by default so the fills read
	// against a category line; a smooth curve drops the snap to glide the rule
	// and tooltip along the interpolation rather than jumping between points.
	const rails = resolveCrosshair(
		crosshair ?? { x: false, y: true, snap: interpolation !== 'smooth' },
	)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const snapPoints = tooltipSnapPoints(stacked, chart.snapPoints, xs.length)

	const navPoints = focusPoints(stacked, chart.snapPoints, stackedGeometry, xs.length)

	const navSeries = focusSeries(stacked, chart.snapSeries, drawn, stackedGeometry, xs.length)

	return (
		<ChartFrame
			{...label}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserve={chart.reserve}
			fill={chart.fill}
			aspect={chart.outerAspect ?? undefined}
			legend={
				chart.legendItems && (
					<ChartLegend
						items={chart.legendItems}
						references={chart.referenceItems}
						hidden={chart.hidden}
						referenceHidden={chart.referenceHidden}
						onToggle={chart.toggleSeries}
						onToggleReference={chart.toggleReference}
						onFocus={chart.setEmphasis}
						panel={legend === 'left' || legend === 'right'}
						texture={tex.active}
					/>
				)
			}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={chart.readout}
			emphasis={chart.emphasis}
			tooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, snapPoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				navPoints,
				chart.orientation,
				referenceStops(labels, chart.referencePositions),
				navSeries,
			)}
			onActiveSeries={chart.setEmphasis}
			className={className}
			annotations={
				<ChartReferenceList
					reference={reference}
					hidden={chart.referenceHidden}
					format={chart.formatAxisValue}
				/>
			}
		>
			{tex.defs}

			{gridLines && chart.gridPositions.length > 0 && (
				<ChartGridLines plot={chart.plot} ticks={chart.gridPositions} />
			)}

			{axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{axes && chart.rightScale && (
				<ChartAxis axis="y" position="right" plot={chart.plot} ticks={chart.rightTicks} />
			)}

			{axes && data.length > 0 && <ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />}

			{axes && <ChartAxisTitles titles={chart.axisTitles} />}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			<ChartValueLabels labels={valueLabelItems} animate={animate} />

			{(showTooltip || rails !== null) && data.length > 0 && (
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
					trigger={trigger}
					snaps={crosshairSnaps(rails)}
				/>
			)}

			{/* Last, over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				plot={chart.plot}
				scale={chart.yScale}
				rightScale={chart.rightScale}
				reference={reference}
				format={chart.formatAxisValue}
				animate={animate}
				labels={labels?.references}
				hidden={chart.referenceHidden}
			/>
		</ChartFrame>
	)
}
