'use client'

import { ChartAxis, ChartAxisTitles } from '../chart-axis'
import { ChartCartesianLegend } from '../chart-cartesian-legend'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { nearSeriesLines, withinSeriesAreas } from '../chart-hit-test'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import {
	type CartesianChartProps,
	type ChartValueLabelConfig,
	resolveTooltip,
} from '../chart-schema'
import { snapTargets } from '../chart-snap'
import { ChartValueLabels, resolveValueLabels } from '../chart-value-labels'
import { bandCenters, useChartCartesian } from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
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
	/**
	 * Draw selective value labels — each series' `endpoints` and / or `extremes`
	 * — placed clear of the marks with overlaps dropped by priority, and, with
	 * `references`, each reference rule's value beside it in place of its hover
	 * tooltip. Off by default; the tooltip and data table carry the full readout.
	 */
	labels?: ChartValueLabelConfig
}

/**
 * A multi-series line chart on the shared cartesian frame: 2px round-joined
 * lines that break at missing values, an optional area wash and point
 * markers, a crosshair-snapped tooltip reading every series at the pointed
 * category, and a visually-hidden data table for assistive tech.
 *
 * @remarks The value domain follows the data; pin `min` / `max` to compare
 * charts on one scale. Focus the plot to drive the crosshair and tooltip by
 * keyboard — the band-axis arrows step categories, the value-axis arrows cycle
 * each category's series values. A reference line joins that value-axis roving,
 * receding the marks when the cursor reaches it — unless `labels.references`
 * draws its value beside it, which stands in for the hover and drops the rove.
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
	tooltip,
	crosshair,
	animate = false,
	points = false,
	fill = false,
	texture = false,
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
			leftAxis,
			rightAxis,
			reference,
			xAxis,
			tickRotation,
			formatValue,
		},
		{ zeroBaseline: false, swatch: () => 'line', legendByValue: true },
	)

	const floor = chart.plot.y + chart.plot.height

	// One band-center array for every series — they all span the same categories.
	const xs = bandCenters(chart)

	// Each visible series draws through its own axis's scale; a series whose
	// scale never resolved takes no marks.
	const drawn = chart.visible.flatMap((meta) => {
		const scale = meta.axis === 'right' ? chart.rightScale : chart.yScale

		return scale ? [{ meta, scale }] : []
	})

	const list: ChartLineSeries[] = drawn.map(({ meta, scale }) => ({
		index: meta.index,
		label: meta.label,
		paint: meta.paint,
		geometry: lineGeometry(meta.values, xs, scale.map, floor, interpolation),
		markers: points,
		dimmed: chart.emphasis !== null && meta.index !== chart.emphasis,
		dashed: meta.dashed,
	}))

	const seriesRuns = list.map((series) => series.geometry.runs)

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
	)

	const marksNode = animate ? (
		<AnimatedChartLineMarks
			list={list}
			fill={fill}
			fills={fills}
			textureActive={tex.active}
			plot={chart.plot}
		/>
	) : (
		<ChartLineMarks list={list} fill={fill} fills={fills} textureActive={tex.active} />
	)

	const rails = resolveCrosshair(crosshair)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	// With reference values labelled beside their rules, the rules shed the hover
	// tooltip they stand in for — so they also leave the keyboard roving, dropping
	// out of the value-axis stops.
	const referenceLabels = labels?.references ?? false

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
			tier={chart.tier}
			legend={<ChartCartesianLegend chart={chart} legend={legend} texture={tex.active} />}
			legendPlacement={typeof legend === 'string' ? legend : undefined}
			readout={chart.readout}
			emphasis={chart.emphasis}
			tooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, chart.snapPoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				chart.snapPoints,
				chart.orientation,
				referenceLabels ? undefined : chart.referencePositions,
				chart.snapSeries,
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

			{chart.axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{chart.axes && chart.rightScale && (
				<ChartAxis axis="y" position="right" plot={chart.plot} ticks={chart.rightTicks} />
			)}

			{chart.axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} />
			)}

			{chart.axes && <ChartAxisTitles titles={chart.axisTitles} />}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={chart.snapPoints}
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
						nearSeriesLines(seriesRuns, x, y) ||
						(fill && withinSeriesAreas(seriesRuns, floor, x, y))
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
				labels={referenceLabels}
				hidden={chart.referenceHidden}
			/>
		</ChartFrame>
	)
}
