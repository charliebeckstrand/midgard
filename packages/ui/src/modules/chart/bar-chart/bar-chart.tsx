'use client'

import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { ChartCartesianAxes } from '../chart-cartesian-axes'
import { MARK_GAP } from '../chart-constants'
import { ChartCrosshair, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartHitArea } from '../chart-hit-area'
import { withinBarMarks } from '../chart-hit-test'
import { ChartLegend } from '../chart-legend'
import { ChartMarksLayer } from '../chart-marks-layer'
import type { ChartOrientation } from '../chart-orientation'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import type { CartesianChartProps } from '../chart-schema'
import { snapTargets } from '../chart-snap'
import { useChartCartesian } from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
import { barMarks, stackedBarMarks } from './bar-chart-geometry'

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
 * column on the summed value axis instead of grouping them side by side. Focus
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
export function BarChart<T>({
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
	orientation = 'vertical',
	stacked = false,
	texture = false,
	min,
	max,
	reference,
	xAxis,
	formatValue,
	className,
	...label
}: BarChartProps<T>) {
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
		{ zeroBaseline: true, swatch: () => 'rect', orientation, stack: stacked },
	)

	const seriesValues = chart.visible.map((meta) => meta.values)

	const marks = !chart.yScale
		? []
		: stacked
			? stackedBarMarks(seriesValues, chart.band, chart.yScale.map, chart.orientation)
			: barMarks(seriesValues, chart.band, chart.yScale.map, chart.baseline, chart.orientation)

	const paints = chart.visible.map((meta) => meta.paint)

	const dimmed = chart.visible.map(
		(meta) => chart.emphasis !== null && meta.index !== chart.emphasis,
	)

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => ({ color: meta.color, paint: meta.paint })),
	)

	const fills = chart.visible.map((meta) => tex.fillFor(meta.color))

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
						references={chart.referenceItems}
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
			focus={cartesianFocus(
				chart.bandPositions,
				chart.snapPoints,
				chart.orientation,
				chart.referencePositions,
			)}
			orientation={chart.orientation}
			className={className}
			annotations={<ChartReferenceList reference={reference} format={formatValue} />}
		>
			{tex.defs}

			<ChartCartesianAxes
				orientation={chart.orientation}
				plot={chart.plot}
				valueTicks={chart.yTicks}
				hasScale={chart.yScale !== null}
				categoryTicks={chart.xTicks}
				hasData={data.length > 0}
				baseline={chart.baseline}
				axes={axes}
				gridLines={gridLines}
			/>

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={chart.snapPoints}
					orientation={chart.orientation}
				/>
			)}

			{(tooltip || rails !== null) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					onData={(x, y) => withinBarMarks(marks, x, y, MARK_GAP, chart.orientation)}
					orientation={chart.orientation}
				/>
			)}

			{/* Last, over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				plot={chart.plot}
				scale={chart.yScale}
				reference={reference}
				orientation={chart.orientation}
				format={formatValue}
				animate={animate}
			/>
		</ChartFrame>
	)
}
