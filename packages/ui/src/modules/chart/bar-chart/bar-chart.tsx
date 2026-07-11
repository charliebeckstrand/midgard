'use client'

import { ChartCartesianAxes } from '../engine/chart-axes/cartesian'
import { MARK_GAP } from '../engine/chart-constants'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../engine/chart-crosshair'
import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import {
	barMarks,
	stackedBarMarks,
	stackedBarSnapPoints,
	stackedBarSnapSeries,
} from '../engine/chart-geometry/bar'
import { ChartHitArea, cartesianHitActive } from '../engine/chart-hit-area'
import { barMarkAt } from '../engine/chart-hit-test'
import { AnimatedChartBarMarks, ChartBarMarks } from '../engine/chart-marks/bar'
import { ChartMarksLayer } from '../engine/chart-marks/layer'
import { type ChartOrientation, valueCoord } from '../engine/chart-orientation'
import { useChartTexture } from '../engine/chart-pattern-defs'
import { ChartReferenceLines } from '../engine/chart-reference-lines'
import { type CartesianChartProps, resolveLegend, resolveTooltip } from '../engine/chart-schema'
import { snappedSeriesAt, snapTargets } from '../engine/chart-snap'
import {
	barProjection,
	cartesianData,
	drawnSeries,
	useChartCartesian,
} from '../engine/use-chart-cartesian'
import { cartesianFocus } from '../engine/use-chart-keyboard'

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
		axes,
		grid = true,
		legend,
		tooltip,
		crosshair,
		animate = false,
		orientation = 'vertical',
		stacked = false,
		thick = false,
		texture = false,
		reference,
		tickRotation,
		onCategoryClick,
		formatValue,
		className,
		...label
	} = props

	// The legend prop resolves to its placement / show value and the inert flag;
	// the hook and frame read the value, the legend the flag.
	const resolvedLegend = resolveLegend(legend)

	const chart = useChartCartesian(cartesianData(props, resolvedLegend.value), {
		zeroBaseline: true,
		swatch: () => 'rect',
		orientation,
		stack: stacked,
	})

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

	// Each drawn series' own index, aligned to `marks`, so the isolation and hit
	// test speak the series identity the emphasis keys on rather than a draw slot.
	const indices = drawn.map((entry) => entry.meta.index)

	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => meta.slot),
	)

	const fills = drawn.map((entry) => tex.fillFor(entry.meta.slot))

	const marksNode = animate ? (
		<AnimatedChartBarMarks
			marks={marks}
			paints={paints}
			indices={indices}
			fills={fills}
			textureActive={tex.active}
			orientation={chart.orientation}
		/>
	) : (
		<ChartBarMarks
			marks={marks}
			paints={paints}
			indices={indices}
			fills={fills}
			textureActive={tex.active}
		/>
	)

	// Spark needs no gate here: the frame renders the drawing pointer-inert and the
	// crosshair and hit layer stand themselves down through ChartTierContext.
	const rails = resolveCrosshair(crosshair)

	const snapping = crosshairSnaps(rails)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	return (
		<ChartCartesianFrame
			{...label}
			chart={chart}
			resolvedLegend={resolvedLegend}
			tex={tex}
			fullscreen={<BarChart {...props} />}
			showTooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, valuePoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				valuePoints,
				chart.orientation,
				chart.referencePositions,
				snapSeries,
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
				baseline={chart.baseline}
				axes={chart.axes}
				grid={grid}
				gridPositions={chart.gridPositions}
				categoryGridPositions={chart.categoryGridPositions}
				categorySeparator={chart.categorySeparator}
				titles={chart.axisTitles}
			/>

			<ChartMarksLayer animate={animate} dataKey={chart.dataKey}>
				{marksNode}
			</ChartMarksLayer>

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={valuePoints}
					orientation={chart.orientation}
				/>
			)}

			{cartesianHitActive(showTooltip, rails, chart.onBandClick, data.length) && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					markAt={(x, y, _held, index) => {
						// Isolation mirrors the readout: on a bar, that bar.
						const hit = barMarkAt(marks, x, y, MARK_GAP, chart.orientation)

						if (hit) return { series: indices[hit.series] ?? hit.series, datum: hit.datum }

						// Past the bars the emphasis goes to the stop the snapped readout
						// anchors — the bar top nearest the pointer along the value axis in
						// the snapped band — isolating that one bar.
						const series = snapping
							? snappedSeriesAt(
									valuePoints,
									snapSeries,
									index,
									valueCoord(chart.orientation, { x, y }),
								)
							: null

						return series === null || index === null ? null : { series, datum: index }
					}}
					orientation={chart.orientation}
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
				orientation={chart.orientation}
				format={chart.formatAxisValue}
				animate={animate}
				hidden={chart.referenceHidden}
			/>
		</ChartCartesianFrame>
	)
}
