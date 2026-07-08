'use client'

import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { ChartCartesianAxes } from '../chart-cartesian-axes'
import { ChartCartesianLegend } from '../chart-cartesian-legend'
import { MARK_GAP } from '../chart-constants'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartHitArea } from '../chart-hit-area'
import { withinBarMarks } from '../chart-hit-test'
import { ChartMarksLayer } from '../chart-marks-layer'
import type { ChartOrientation } from '../chart-orientation'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import { type CartesianChartProps, resolveTooltip } from '../chart-schema'
import { snapTargets } from '../chart-snap'
import { barProjection, drawnSeries, useChartCartesian } from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
import {
	barMarks,
	stackedBarMarks,
	stackedBarSnapPoints,
	stackedBarSnapSeries,
} from './bar-chart-geometry'

/**
 * Props for {@link BarChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type BarChartProps<T> = CartesianChartProps<T> & {
	/**
	 * Which way the bars grow: `'vertical'` from a bottom baseline up the value
	 * axis, or `'horizontal'` from a left baseline out along it — categories then
	 * run down the side, so long labels read straight and many categories fit.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * Stack each category's series into one column — segments piled to their
	 * running total, the value axis scaled to that sum — instead of grouping them
	 * side by side. A surface gap separates the segments and only the outermost
	 * keeps a rounded end.
	 * @remarks Positive values only: a non-positive value takes no segment, the
	 * same part-to-whole reading as the stacked {@link AreaChart}.
	 * @defaultValue false
	 */
	stacked?: boolean
	/**
	 * Let the bars fill their band instead of capping at the spec thickness:
	 * grouped bars split the band by series and the surface gaps, a stacked
	 * column takes the whole band. Suits a sparse category axis, where the
	 * default ceiling would otherwise strand narrow bars in wide bands.
	 * @defaultValue false
	 */
	thick?: boolean
}

/**
 * A grouped bar chart: one band per row of `data`, one zero-baseline bar per
 * series inside it, on the shared cartesian frame — value axis with clean
 * ticks, hairline gridlines, a legend for two or more series, a hover
 * tooltip reading every series at the pointed category, and a
 * visually-hidden data table for assistive tech.
 *
 * @remarks Bars cap at the spec thickness with a rounded data end and a
 * square baseline end; negative values grow the other way from the zero line.
 * `orientation="horizontal"` transposes the whole frame — value axis on the
 * bottom, categories down the left — which suits long category labels and
 * ranked lists. `stacked` piles each category's series into one part-to-whole
 * column on the summed value axis instead of grouping them side by side; `thick`
 * lifts the thickness cap so the bars fill their band, for a sparse axis. Focus
 * the plot to drive the crosshair and tooltip by keyboard — the band-axis
 * arrows step categories, the value-axis arrows cycle each category's series
 * values, transposed with the orientation. A reference line joins that
 * value-axis roving, receding the marks when the cursor reaches it.
 * @example
 * ```tsx
 * <BarChart
 *   aria-label="Revenue by quarter"
 *   data={quarters}
 *   series={[
 *     { xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
 *     { xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
 *   ]}
 * />
 * ```
 */
export function BarChart<T>(props: BarChartProps<T>) {
	const {
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
		orientation = 'vertical',
		stacked = false,
		thick = false,
		texture = false,
		min,
		max,
		leftAxis,
		rightAxis,
		reference,
		xAxis,
		tickRotation,
		formatValue,
		className,
		...label
	} = props

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
			// The header travels to the frame through `label`; the hook reads it too,
			// so its tier reserves the header band's height (see `cartesianChrome`).
			title: label.title,
			subtitle: label.subtitle,
		},
		{ zeroBaseline: true, swatch: () => 'rect', orientation, stack: stacked },
	)

	// Each visible series draws through its own axis's scale and grows from its
	// own baseline; a series whose scale never resolved takes no marks.
	const drawn = drawnSeries(chart)

	const seriesValues = drawn.map((entry) => entry.meta.values)

	const projection = barProjection(drawn, chart.baseline)

	const stackScale = drawn[0]?.scale

	const marks = stacked
		? stackScale
			? stackedBarMarks(seriesValues, chart.band, stackScale.map, chart.orientation, thick)
			: []
		: barMarks(
				seriesValues,
				chart.band,
				projection.map,
				projection.baseline,
				chart.orientation,
				thick,
			)

	// Stacked segments sit at cumulative tops, not the individual from-zero values
	// `chart.snapPoints` carries, so the crosshair snap and keyboard cursor read the
	// drawn edges; grouped bars each grow from one baseline and match as they are.
	const valuePoints = stacked
		? stackedBarSnapPoints(marks, data.length, chart.orientation)
		: chart.snapPoints

	const snapSeries = stacked
		? stackedBarSnapSeries(
				marks,
				drawn.map((entry) => entry.meta.index),
				data.length,
			)
		: chart.snapSeries

	const paints = drawn.map((entry) => entry.meta.paint)

	const dimmed = drawn.map(
		(entry) => chart.emphasis !== null && entry.meta.index !== chart.emphasis,
	)

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => meta.slot),
	)

	const fills = drawn.map((entry) => tex.fillFor(entry.meta.slot))

	const marksNode = animate ? (
		<AnimatedChartBarMarks
			marks={marks}
			paints={paints}
			dimmed={dimmed}
			fills={fills}
			textureActive={tex.active}
			orientation={chart.orientation}
		/>
	) : (
		<ChartBarMarks
			marks={marks}
			paints={paints}
			dimmed={dimmed}
			fills={fills}
			textureActive={tex.active}
		/>
	)

	// Spark needs no gate here: the frame renders the drawing pointer-inert and the
	// crosshair and hit layer stand themselves down through ChartTierContext.
	const rails = resolveCrosshair(crosshair)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	return (
		<ChartFrame
			{...label}
			fullscreen={<BarChart {...props} />}
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
			snap={snapTargets(rails, chart.bandPositions, valuePoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				valuePoints,
				chart.orientation,
				chart.referencePositions,
				snapSeries,
			)}
			onActiveSeries={chart.setEmphasis}
			orientation={chart.orientation}
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

			<ChartCartesianAxes
				orientation={chart.orientation}
				plot={chart.plot}
				valueTicks={chart.yTicks}
				hasScale={chart.yScale !== null}
				rightTicks={chart.rightTicks}
				hasRightScale={chart.rightScale !== null}
				categoryTicks={chart.xTicks}
				hasData={data.length > 0}
				baseline={chart.baseline}
				axes={chart.axes}
				gridLines={gridLines}
				gridPositions={chart.gridPositions}
				titles={chart.axisTitles}
			/>

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={valuePoints}
					orientation={chart.orientation}
				/>
			)}

			{(showTooltip || rails !== null) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					onData={(x, y) => withinBarMarks(marks, x, y, MARK_GAP, chart.orientation)}
					orientation={chart.orientation}
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
				orientation={chart.orientation}
				format={chart.formatAxisValue}
				animate={animate}
				hidden={chart.referenceHidden}
			/>
		</ChartFrame>
	)
}
