'use client'

import { type BarMark, barMarks } from '../bar-chart/bar-chart-geometry'
import { ChartAxis, ChartAxisTitles } from '../chart-axis'
import { AnimatedChartBarMarks, ChartBarMarks } from '../chart-bar-marks'
import { ChartCartesianLegend } from '../chart-cartesian-legend'
import { MARK_GAP } from '../chart-constants'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import { ChartHitArea } from '../chart-hit-area'
import { barMarkAt, nearestSeriesArea, nearestSeriesLine } from '../chart-hit-test'
import { lineMarkReach } from '../chart-layout'
import { AnimatedChartLineMarks, ChartLineMarks, type ChartLineSeries } from '../chart-line-marks'
import { ChartMarksLayer } from '../chart-marks-layer'
import { useChartTexture } from '../chart-pattern-defs'
import { ChartReferenceLines, ChartReferenceList } from '../chart-reference-lines'
import {
	type CartesianFrameProps,
	type ChartBaseProps,
	type ChartValueLabelConfig,
	type ComboChartSeries,
	resolveTooltip,
} from '../chart-schema'
import { snappedSeriesAt, snapTargets } from '../chart-snap'
import { ChartValueLabels, resolveValueLabels } from '../chart-value-labels'
import type { ChartMarkRef } from '../context'
import { type LineInterpolation, lineGeometry } from '../line-chart/line-chart-geometry'
import {
	bandCenters,
	barProjection,
	type DrawnSeries,
	drawnSeries,
	useChartCartesian,
} from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'

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
		/**
		 * Draw selective value labels — each line and area series' `endpoints` and /
		 * or `extremes`, bars excluded — overlaps dropped by priority. Off by
		 * default; the tooltip and data table carry the full readout.
		 */
		labels?: ChartValueLabelConfig
	}

/** The drawn geometry {@link comboMarkAt} resolves the pointer against. @internal */
type ComboMarks = {
	/** The line series, then the area series behind them in stroke order. */
	lines: ChartLineSeries[]
	areas: ChartLineSeries[]
	/** Series-major bar marks, with each bar series' own index alongside. */
	bars: (BarMark | null)[][]
	barIndices: number[]
	/** The plot floor the area fills read down to. */
	floor: number
}

/**
 * The held mark's position among the strokes — the drawn slot the sticky
 * resolution keys on — or `null` when the held mark is a bar or absent.
 *
 * @internal
 */
function heldStrokeAt(strokes: ChartLineSeries[], held: ChartMarkRef | null): number | null {
	if (!held || held.datum !== null) return null

	const at = strokes.findIndex((entry) => entry.index === held.series)

	return at < 0 ? null : at
}

/** Each stroke series' gap-split runs, in the order `strokes` lists them. @internal */
function comboStrokeRuns(strokes: ChartLineSeries[]) {
	return strokes.map((entry) => entry.geometry.runs)
}

/**
 * The combo's pointer-to-mark resolution. Strokes compete by proximity, never
 * draw order: the lines and the areas' top edges are all thin marks, so the
 * nearest one is the one being pointed at — a pointer on an area's dot resolves
 * that area even with a line inside the catch tolerance, and vice versa — with
 * the held stroke kept sticky across their midline. Kinds that can't be
 * compared by distance rank by the visual stack instead: any stroke outranks a
 * fill (strokes draw on top), and the fills resolve by containment with the
 * wash winning the bar it covers.
 *
 * @internal
 */
function comboMarkAt(
	marks: ComboMarks,
	x: number,
	y: number,
	held: ChartMarkRef | null,
): ChartMarkRef | null {
	const { lines, areas, bars, barIndices, floor } = marks

	const strokes = [...lines, ...areas]

	const strokeRuns = comboStrokeRuns(strokes)

	const stroke = nearestSeriesLine(strokeRuns, x, y, undefined, heldStrokeAt(strokes, held))

	if (stroke !== null) return { series: strokes[stroke]?.index ?? stroke, datum: null }

	const area = nearestSeriesArea(comboStrokeRuns(areas), floor, x, y)

	if (area !== null) return { series: areas[area]?.index ?? area, datum: null }

	const bar = barMarkAt(bars, x, y, MARK_GAP)

	return bar && { series: barIndices[bar.series] ?? bar.series, datum: bar.datum }
}

/**
 * A combined bar, line, and area chart: one shared value axis by default, with
 * a second on request — a series carrying `axis: 'right'` reads the secondary
 * scale the `{ position: 'right' }` axis entry shapes, so a count plots beside a
 * currency at its natural size. Bars sit at the back, the translucent area washes ride over
 * them, and lines draw on top; every series reads a zero-baseline domain, and
 * the frame is the cartesian standard: axes, gridlines, legend, crosshair
 * tooltip, and the visually-hidden data table.
 *
 * @remarks Under `animate`, the bars rise, the area washes fade, and the lines
 * draw together — one synchronized reveal across the x and y motions. Focus the
 * plot to drive the crosshair and tooltip by keyboard — the band-axis arrows
 * step categories, the value-axis arrows cycle each category's series values,
 * both axes' points interleaved in screen order. A reference line joins that
 * value-axis roving, receding the marks when the cursor reaches it.
 * @example
 * ```tsx
 * <ComboChart
 *   aria-label="Shipments and exception rate by week"
 *   data={weeks}
 *   series={[
 *     { type: 'area', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
 *     { type: 'line', xKey: 'week', yKey: 'exceptions', yName: 'Exceptions', axis: 'right' },
 *   ]}
 *   axes={[{ position: 'right', title: 'Exceptions' }]}
 * />
 * ```
 */
export function ComboChart<T>(props: ComboChartProps<T>) {
	const {
		data,
		series,
		size,
		width,
		height,
		aspectRatio,
		axes,
		gridLines = true,
		legend,
		tooltip,
		crosshair,
		animate = false,
		points = true,
		interpolation = 'linear',
		reference,
		tickRotation,
		texture = false,
		labels,
		onCategoryClick,
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
			reference,
			tickRotation,
			onCategoryClick,
			formatValue,
			// The header travels to the frame through `label`; the hook reads it too,
			// so its tier reserves the header band's height (see `cartesianChrome`).
			title: label.title,
			subtitle: label.subtitle,
		},
		{
			zeroBaseline: true,
			swatch: (_, index) => (series[index]?.type === 'bar' ? 'rect' : 'line'),
			// Only the line and area series paint past their coordinate — bars end at
			// theirs — so the inset stands only where such a series exists to need it.
			markInset: series.some((entry) => entry.type !== 'bar') ? lineMarkReach(points) : 0,
		},
	)

	// Spark needs no gate here: the frame renders the drawing pointer-inert, and
	// the crosshair, hit layer, value labels, and reference hovers stand
	// themselves down through ChartTierContext.
	const floor = chart.plot.y + chart.plot.height

	// Each visible series draws through its own axis's scale; the mark kinds
	// partition off the one drawn list so their indices stay aligned.
	const drawn = drawnSeries(chart)

	const pick = (type: ComboChartSeries<T>['type']) =>
		drawn.filter((entry) => (series[entry.meta.index]?.type ?? 'bar') === type)

	const barEntries = pick('bar')

	const lineEntries = pick('line')

	const areaEntries = pick('area')

	const projection = barProjection(barEntries, chart.baseline)

	const bars = barMarks(
		barEntries.map((entry) => entry.meta.values),
		chart.band,
		projection.map,
		projection.baseline,
	)

	// Lines and areas share the polyline geometry; an area is a line that also
	// fills down to the baseline.
	const xs = bandCenters(chart)

	const toSeries = (entries: DrawnSeries[]): ChartLineSeries[] =>
		entries.map(({ meta, scale }) => ({
			index: meta.index,
			label: meta.label,
			paint: meta.paint,
			geometry: lineGeometry(meta.values, xs, scale.map, floor, interpolation),
			markers: points,
			dashed: meta.dashed,
		}))

	const lines = toSeries(lineEntries)

	const areas = toSeries(areaEntries)

	// Value labels ride the line and area series only — bars read against the axis.
	const labelled = [...areaEntries, ...lineEntries]

	const valueLabelItems = resolveValueLabels(
		labels,
		[...areas, ...lines],
		labelled.map(({ meta }) => meta),
		chart.plot,
		formatValue,
		labelled.map(
			({ meta }) =>
				(value: number) =>
					chart.formatAxisValue(value, meta.axis),
		),
	)

	const barPaints = barEntries.map((entry) => entry.meta.paint)

	// The bar series' own indices, aligned to `bars`, so the isolation keys on the
	// series identity rather than the bar's slot among the picked bar series.
	const barIndices = barEntries.map((entry) => entry.meta.index)

	// One tile set over every visible slot, so the bars and area washes both
	// resolve their fill; the line series carry no fill and stay flat.
	const tex = useChartTexture(
		texture,
		chart.visible.map((meta) => meta.slot),
	)

	const barFills = barEntries.map((entry) => tex.fillFor(entry.meta.slot))

	const areaFills = areaEntries.map((entry) => tex.fillFor(entry.meta.slot))

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
			<AnimatedChartBarMarks
				marks={bars}
				paints={barPaints}
				indices={barIndices}
				fills={barFills}
				textureActive={tex.active}
			/>

			<AnimatedChartLineMarks
				list={areas}
				fill={true}
				stroke={stroke}
				fills={areaFills}
				textureActive={tex.active}
				plot={chart.plot}
			/>

			<AnimatedChartLineMarks list={lines} fill={false} stroke={stroke} plot={chart.plot} />
		</>
	) : (
		<>
			<ChartBarMarks
				marks={bars}
				paints={barPaints}
				indices={barIndices}
				fills={barFills}
				textureActive={tex.active}
			/>

			<ChartLineMarks
				list={areas}
				fill={true}
				stroke={stroke}
				fills={areaFills}
				textureActive={tex.active}
			/>

			<ChartLineMarks list={lines} fill={false} stroke={stroke} />
		</>
	)

	const rails = resolveCrosshair(crosshair)

	const snapping = crosshairSnaps(rails)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	return (
		<ChartFrame
			{...label}
			fullscreen={<ComboChart {...props} />}
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
			readoutOrder={chart.readoutOrder}
			emphasis={chart.emphasis}
			tooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, chart.snapPoints)}
			focus={cartesianFocus(
				chart.bandPositions,
				chart.snapPoints,
				chart.orientation,
				chart.referencePositions,
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

			{chart.categoryGridPositions.length > 0 && (
				<ChartGridLines
					plot={chart.plot}
					ticks={chart.categoryGridPositions}
					orientation="horizontal"
					dashed={chart.categorySeparator === 'dashed'}
				/>
			)}

			{chart.axes && chart.yScale && <ChartAxis axis="y" plot={chart.plot} ticks={chart.yTicks} />}

			{chart.axes && chart.rightScale && (
				<ChartAxis axis="y" position="right" plot={chart.plot} ticks={chart.rightTicks} />
			)}

			{chart.axes && data.length > 0 && (
				<ChartAxis axis="x" plot={chart.plot} ticks={chart.xTicks} baseline={chart.baseline} />
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

			<ChartMarksLayer animate={animate} dataKey={chart.dataKey}>
				{marksNode}
			</ChartMarksLayer>

			<ChartValueLabels labels={valueLabelItems} animate={animate} dataKey={chart.dataKey} />

			{(showTooltip || rails !== null || chart.onBandClick !== undefined) && data.length > 0 && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={data.length}
					markAt={(x, y, held, index) => {
						const direct = comboMarkAt({ lines, areas, bars, barIndices, floor }, x, y, held)

						if (direct) return direct

						// Isolation mirrors the snapped readout: off every mark the emphasis
						// goes to the stop the tooltip anchors in the snapped column — a bar's
						// stop isolating that one bar, a line's or area's its whole series.
						const meta = snapping
							? snappedSeriesAt(chart.snapPoints, chart.snapSeries, index, y)
							: null

						if (meta === null || index === null) return null

						return { series: meta, datum: (series[meta]?.type ?? 'bar') === 'bar' ? index : null }
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
				rightScale={chart.rightScale}
				reference={reference}
				format={chart.formatAxisValue}
				animate={animate}
				hidden={chart.referenceHidden}
			/>
		</ChartFrame>
	)
}
