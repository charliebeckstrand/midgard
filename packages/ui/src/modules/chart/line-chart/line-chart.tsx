'use client'

import { ChartCartesianAxes } from '../engine/chart-axes/cartesian'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../engine/chart-crosshair'
import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import { type LineInterpolation, lineSeriesOf } from '../engine/chart-geometry/line'
import { ChartHitArea, cartesianHitActive } from '../engine/chart-hit-area'
import { nearestSeriesArea, nearestSeriesLine } from '../engine/chart-hit-test'
import { lineMarkReach } from '../engine/chart-layout'
import { resolveLegend } from '../engine/chart-legend/schema'
import { ChartMarksLayer } from '../engine/chart-marks/layer'
import { AnimatedChartLineMarks, ChartLineMarks } from '../engine/chart-marks/line'
import { useChartTexture } from '../engine/chart-pattern-defs'
import { ChartReferenceLines } from '../engine/chart-reference-lines'
import { snappedSeriesAt, snapTargets } from '../engine/chart-snap'
import { resolveTooltip } from '../engine/chart-tooltip'
import type { ChartValueLabelConfig } from '../engine/chart-value-labels'
import {
	axisLabelFormats,
	ChartValueLabels,
	resolveValueLabels,
	valueLabelHeadroom,
} from '../engine/chart-value-labels'
import type { CartesianChartProps } from '../engine/types'
import {
	bandCenters,
	cartesianData,
	drawnSeries,
	useChartCartesian,
} from '../engine/use-chart-cartesian'
import { cartesianFocus } from '../engine/use-chart-keyboard'

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
export function LineChart<T>(props: LineChartProps<T>) {
	const {
		data,
		series,
		size,
		width,
		height,
		aspectRatio,
		axes,
		legend,
		tooltip,
		crosshair,
		animate = false,
		points = false,
		fill = false,
		texture = false,
		interpolation = 'linear',
		reference,
		labels,
		onCategoryClick,
		formatValue,
		className,
		...label
	} = props

	const resolvedLegend = resolveLegend(legend)

	const chart = useChartCartesian(cartesianData(props, resolvedLegend.value), {
		zeroBaseline: false,
		swatch: () => 'line',
		legendByValue: true,
		markInset: lineMarkReach(points),
		// Reserve the room the point labels need past the data extremes, so a
		// label at an edge sits clear of the line rather than flip onto it.
		valueHeadroom: valueLabelHeadroom(labels, series.length),
	})

	// Spark needs no gate here: the frame renders the drawing pointer-inert, and
	// the crosshair, hit layer, value labels, and reference hovers stand
	// themselves down through ChartTierContext.
	const floor = chart.plot.y + chart.plot.height

	// One band-center array for every series — they all span the same categories.
	const xs = bandCenters(chart)

	// Each visible series draws through its own axis's scale; a series whose
	// scale never resolved takes no marks.
	const drawn = drawnSeries(chart)

	const list = lineSeriesOf(drawn, xs, floor, interpolation, points)

	const seriesRuns = list.map((series) => series.geometry.runs)

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => meta.slot),
	)

	const fills = drawn.map(({ meta }) => tex.fillFor(meta.slot))

	// A plot too short to afford the reserved label room sheds the point labels
	// whole — the layout decides by the same test the scale reserved by, so a
	// label never renders against an unreserved edge.
	const drawnMetas = drawn.map(({ meta }) => meta)

	const valueLabelItems = chart.valueLabelRoom
		? resolveValueLabels(
				labels,
				list,
				drawnMetas,
				chart.plot,
				formatValue,
				axisLabelFormats(drawnMetas, chart.formatAxisValue),
			)
		: []

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

	const snapping = crosshairSnaps(rails)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	// With reference values labelled beside their rules, the rules shed the hover
	// tooltip they stand in for — so they also leave the keyboard roving, dropping
	// out of the value-axis stops.
	const referenceLabels = labels?.references ?? false

	return (
		<ChartCartesianFrame
			{...label}
			chart={chart}
			resolvedLegend={resolvedLegend}
			tex={tex}
			fullscreen={<LineChart {...props} />}
			showTooltip={showTooltip}
			tooltipTrigger={trigger}
			snap={snapTargets(rails, chart.bandPositions, chart.snapPoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				chart.snapPoints,
				chart.orientation,
				referenceLabels ? undefined : chart.referencePositions,
				chart.snapSeries,
			)}
			reference={reference}
			className={className}
		>
			<ChartCartesianAxes
				orientation={chart.orientation}
				plot={chart.plot}
				valueTicks={chart.yTicks}
				hasScale={chart.yScale !== null}
				y2Ticks={chart.y2Ticks}
				hasY2Scale={chart.y2Scale !== null}
				categoryTicks={chart.xTicks}
				hasData={data.length > 0}
				axes={chart.axes}
				gridPositions={chart.gridPositions}
				categoryGridPositions={chart.categoryGridPositions}
				categorySeparator={chart.categorySeparator}
				titles={chart.axisTitles}
			/>

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={chart.snapPoints}
				/>
			)}

			<ChartMarksLayer animate={animate} dataKey={chart.dataKey}>
				{marksNode}
			</ChartMarksLayer>

			<ChartValueLabels labels={valueLabelItems} animate={animate} dataKey={chart.dataKey} />

			{cartesianHitActive(showTooltip, rails, chart.onBandClick, data.length) && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					markAt={(x, y, held, index) => {
						// A pointer on a line keeps that line — held sticky where two catches
						// overlap — and a filled chart reads the wash under it the same way.
						const heldAt = held ? list.findIndex((entry) => entry.index === held.series) : -1

						const near =
							nearestSeriesLine(seriesRuns, x, y, undefined, heldAt < 0 ? null : heldAt) ??
							(fill ? nearestSeriesArea(seriesRuns, floor, x, y) : null)

						if (near !== null) return { series: list[near]?.index ?? near, datum: null }

						// Isolation mirrors the snapped readout: off the strokes the emphasis
						// goes to the series point the tooltip anchors in the snapped column.
						const series = snapping
							? snappedSeriesAt(chart.snapPoints, chart.snapSeries, index, y)
							: null

						return series === null ? null : { series, datum: null }
					}}
					trigger={trigger}
					snaps={snapping}
					onIndexClick={chart.onBandClick}
				/>
			)}

			{/* Last, over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				plot={chart.plot}
				scale={chart.yScale}
				y2Scale={chart.y2Scale}
				reference={reference}
				format={chart.formatAxisValue}
				animate={animate}
				labels={referenceLabels}
				hidden={chart.referenceHidden}
			/>
		</ChartCartesianFrame>
	)
}
