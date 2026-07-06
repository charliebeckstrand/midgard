'use client'

import { cn } from '../../../core'
import { type FrameSizing, usePlotFrame } from '../../../hooks'
import { useResolvedSize } from '../../../primitives/density'
import type { Step } from '../../../recipes'
import { type ChartSeriesColor, k } from '../../../recipes/kata/chart'
import { ChartAxis } from '../chart-axis'
import { CHART_METRICS, PLOT_TOP_PAD, SCATTER_HIT_SLACK, X_AXIS_HEIGHT } from '../chart-constants'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../chart-crosshair'
import { ChartFrame } from '../chart-frame'
import { ChartGridLines } from '../chart-grid-lines'
import {
	type ChartAspectRatio,
	chartFrameLayout,
	type PlotRect,
	plotRect,
	valueTicksOf,
} from '../chart-layout'
import type { ChartLegendItem } from '../chart-legend'
import { ChartLegend } from '../chart-legend'
import { ChartMarksLayer } from '../chart-marks-layer'
import { type LinearScale, linearScale } from '../chart-scale'
import {
	type ChartBaseProps,
	type ChartLegendPlacement,
	type Crosshair,
	resolveTooltip,
	type ScatterChartSeries,
} from '../chart-schema'
import { formatChartValue, type SlotPaint } from '../chart-series'
import { snapTargets } from '../chart-snap'
import type { ChartReadout } from '../types'
import { cartesianFocus } from '../use-chart-keyboard'
import { useChartSeriesToggle } from '../use-chart-series-toggle'
import {
	diameterRange,
	type ScatterDatum,
	scatterData,
	scatterMarks,
	scatterReadoutValues,
	scatterSnapColumns,
	scatterXRange,
	sizeDomain,
	sizeRadius,
	uniqueXValues,
	withinScatterMarks,
} from './scatter-chart-geometry'
import { ScatterChartHitArea } from './scatter-chart-hit-area'
import {
	AnimatedScatterChartMarks,
	type ChartScatterSeries,
	ScatterChartMarks,
} from './scatter-chart-marks'

/**
 * The frame switches the point charts (Scatter / Bubble) add on top of
 * {@link ChartBaseProps}: axes and gridlines both ways, per-axis domain pins,
 * the x formatter, and the hover crosshair.
 *
 * @internal
 */
export type ScatterFrameProps = {
	/** Resolves against enclosing Density; sets the default frame height and tick count. */
	size?: Step
	/**
	 * Draw the x and y axes.
	 * @defaultValue true
	 */
	axes?: boolean
	/**
	 * Draw hairline gridlines at both axes' ticks — both are value axes here,
	 * so the grid reads both ways.
	 * @defaultValue true
	 */
	gridLines?: boolean
	/**
	 * Draw a hover crosshair. `true` draws both rules; a {@link Crosshair}
	 * object snaps them to the nearest point (`snap`) or drops one. Opt-in:
	 * nothing is drawn unless set.
	 */
	crosshair?: boolean | Crosshair
	/** y-domain floor; defaults to the data. Pin it to compare charts on one scale. */
	min?: number
	/** y-domain ceiling; defaults to the data maximum. */
	max?: number
	/** x-domain floor; defaults to the data. */
	xMin?: number
	/** x-domain ceiling; defaults to the data maximum. */
	xMax?: number
	/** Formats x ticks and the readout's x column. @defaultValue locale integer / fraction */
	formatXValue?: (value: number) => string
}

/**
 * Props for {@link ScatterChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type ScatterChartProps<T> = ChartBaseProps<T> &
	ScatterFrameProps & {
		/** The series to plot, one disc per parseable row; slot colours follow this order. */
		series: ScatterChartSeries<T>[]
	}

/** One series resolved to everything the frame parts read. @internal */
type ScatterMeta = {
	index: number
	label: string
	paint: SlotPaint
	color: ChartSeriesColor
	points: ScatterDatum[]
	sized: boolean
	sizeName: string | null
	radius: (size: number | null) => number
}

/**
 * Every series parsed and resolved: paint, points, and the bubble radius
 * scaling. A scatter series names only a palette slot — no raw colour, unlike
 * the band-axis series — so its colour resolves directly to the slot in the
 * fixed order, the way the cartesian series did before a raw colour became an
 * option there.
 *
 * @internal
 */
function scatterMetas<T>(data: T[], series: ScatterChartSeries<T>[]): ScatterMeta[] {
	return series.map((entry, index) => {
		const points = scatterData(data, entry)

		const domain = entry.sizeKey === undefined ? null : sizeDomain(points)

		const diameters = diameterRange(entry.size, entry.maxSize)

		const color = entry.color ?? k.order[index % k.order.length] ?? 'blue'

		return {
			index,
			label: entry.yName ?? entry.yKey,
			paint: k.series[color],
			color,
			points,
			sized: domain !== null,
			sizeName: entry.sizeKey === undefined ? null : (entry.sizeName ?? entry.sizeKey),
			radius: (size) => sizeRadius(size, domain, diameters),
		}
	})
}

/** The readout behind the discs: unique x columns crossed with each series' points. @internal */
function scatterReadout(
	visible: ScatterMeta[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatX: (value: number) => string,
): ChartReadout | null {
	if (visible.length === 0 || uniqueXs.length === 0) return null

	return {
		categories: uniqueXs.map(formatX),
		rows: visible.map((meta) => ({
			label: meta.label,
			swatchClass: cn(meta.paint.text),
			swatch: 'rect',
			values: scatterReadoutValues(
				meta.points,
				uniqueXs,
				format,
				meta.sizeName === null ? null : (size) => `${meta.sizeName}: ${formatChartValue(size)}`,
			),
		})),
	}
}

/** The resolved frame flags: the plot's sizing plus the figure and legend layout. @internal */
type ScatterFrame = {
	sizing: FrameSizing
	/** The whole-chart aspect the figure carries; `undefined` when the plot box reserves its own. */
	frameAspect?: number
	/** The plot grows into its region's height rather than reserving one. */
	fill: boolean
	/** The legend is a side panel, so it lays out beside the plot. */
	aside: boolean
	/** The legend's resolved placement, or `undefined` for the default row. */
	placement?: ChartLegendPlacement
}

/**
 * The scatter frame's sizing and legend layout resolved together: a live ratio
 * with a legend goes to the figure wrapper so the whole chart holds it (the plot
 * measuring the height the legend leaves), and the legend's placement drives the
 * panel-vs-row layout. Derived from the props alone, so it precedes any
 * measurement.
 *
 * @internal
 */
function scatterFrame(
	legend: ScatterChartProps<unknown>['legend'],
	seriesCount: number,
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
): ScatterFrame {
	const { sizing, outerAspect } = chartFrameLayout(
		height,
		aspectRatio,
		Boolean(legend ?? seriesCount > 1),
	)

	return {
		sizing,
		frameAspect: outerAspect ?? undefined,
		fill: sizing.mode === 'fill' || sizing.mode === 'aspect-fill',
		aside: legend === 'left' || legend === 'right',
		placement: typeof legend === 'string' ? legend : undefined,
	}
}

/** The legend entries: on request, or by default once a second series needs telling apart. @internal */
function scatterLegendItems(
	metas: ScatterMeta[],
	legend: ScatterChartProps<unknown>['legend'],
): ChartLegendItem[] | null {
	if (!(legend ?? metas.length > 1)) return null

	return metas.map((meta) => ({
		index: meta.index,
		label: meta.label,
		swatchClass: meta.paint.text.join(' '),
		swatch: 'rect',
		color: meta.color,
	}))
}

/** Both scales' pins, lifted off the props. @internal */
type ScatterPins = { min?: number; max?: number; xMin?: number; xMax?: number }

/** The resolved scatter plot: rect, scales, and ticks for both axes. @internal */
type ScatterScales = {
	plot: PlotRect
	xScale: LinearScale | null
	yScale: LinearScale | null
	xTicks: { at: number; label: string }[]
	yTicks: { at: number; label: string }[]
}

/**
 * Both scales resolved: y from the frame height first, so its tick labels can
 * size the left gutter, then x filling the plot width the labels leave, inset
 * so its centered end labels clear the frame.
 *
 * @internal
 */
function scatterScales(args: {
	visible: ScatterMeta[]
	frameWidth: number
	frameHeight: number
	axes: boolean
	tickTarget: number
	pins: ScatterPins
	format: (value: number) => string
	formatX: (value: number) => string
}): ScatterScales {
	const { visible, frameWidth, frameHeight, axes, tickTarget, pins, format, formatX } = args

	const yScale = linearScale({
		values: visible.flatMap((meta) => meta.points.map((point) => point.y)),
		range: [frameHeight - (axes ? X_AXIS_HEIGHT : 0), PLOT_TOP_PAD],
		tickTarget,
		min: pins.min,
		max: pins.max,
	})

	const yTicks = valueTicksOf(yScale, format)

	const plot = plotRect(
		frameWidth,
		frameHeight,
		axes,
		yTicks.map((tick) => tick.label),
	)

	const xValues = visible.flatMap((meta) => meta.points.map((point) => point.x))

	const xOptions = { tickTarget, min: pins.xMin, max: pins.xMax }

	const span: [number, number] = [plot.x, plot.x + plot.width]

	const xScale = linearScale({
		values: xValues,
		range: axes ? scatterXRange(xValues, xOptions, formatX, span) : span,
		...xOptions,
	})

	return { plot, xScale, yScale, xTicks: valueTicksOf(xScale, formatX), yTicks }
}

/** The scatter frame's chrome: both axes' gridlines and tick labels. @internal */
function ScatterChrome(props: {
	plot: PlotRect
	axes: boolean
	gridLines: boolean
	xScale: LinearScale | null
	yScale: LinearScale | null
	xTicks: { at: number; label: string }[]
	yTicks: { at: number; label: string }[]
}) {
	const { plot, axes, gridLines, xScale, yScale, xTicks, yTicks } = props

	return (
		<>
			{gridLines && yScale && <ChartGridLines plot={plot} ticks={yTicks.map((tick) => tick.at)} />}

			{gridLines && xScale && (
				<ChartGridLines
					plot={plot}
					ticks={xTicks.map((tick) => tick.at)}
					orientation="horizontal"
				/>
			)}

			{axes && yScale && <ChartAxis axis="y" plot={plot} ticks={yTicks} />}

			{axes && xScale && <ChartAxis axis="x" plot={plot} ticks={xTicks} />}
		</>
	)
}

/**
 * A multi-series scatter chart: numeric fields on both axes, one surface-ringed
 * disc per parseable row, on linear scales with clean ticks both ways. Rows
 * need no shared category set — unlike the band-axis charts the x field is a
 * number, values arrive in any order, duplicates included — so it holds up
 * against ragged or machine-generated datasets: a point whose x or y fails to
 * parse drops out, never the scale. A `sizeKey` on a series adds the bubble
 * encoding ({@link BubbleChart} requires it); the legend toggles series, the
 * tooltip reads every series at the pointed x, and a visually-hidden data table
 * carries full value parity.
 *
 * @remarks The hover, crosshair snap, and keyboard cursor key on the sorted
 * unique x values the way the band charts key on categories: focus the plot and
 * the horizontal arrows walk x columns while the vertical arrows step the
 * points at one — duplicates included. The `texture` identity channel does not
 * apply to discs and is ignored here.
 * @example
 * ```tsx
 * <ScatterChart
 *   aria-label="Dwell time against distance"
 *   data={stops}
 *   series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
 * />
 * ```
 */
export function ScatterChart<T>({
	data,
	series,
	size,
	width,
	height,
	aspectRatio = '16/9',
	axes = true,
	gridLines = true,
	legend,
	tooltip,
	crosshair,
	animate = false,
	min,
	max,
	xMin,
	xMax,
	formatValue,
	formatXValue,
	className,
	...label
}: ScatterChartProps<T>) {
	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	// The legend shares the aspect box, so a ratio describes the whole chart: with
	// a legend a live ratio goes to the figure wrapper and the plot measures the
	// height it leaves. Derived from the props — a legend shows for two or more
	// series unless forced — so no measurement precedes the sizing.
	// A live ratio with a legend describes the whole chart: the figure carries the
	// ratio and the plot measures the height the legend leaves. Resolved from the
	// props, so it precedes the measurement below.
	const {
		sizing,
		frameAspect,
		fill: fillFrame,
		aside,
		placement,
	} = scatterFrame(legend, series.length, height, aspectRatio)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	const format = formatValue ?? formatChartValue

	const formatX = formatXValue ?? formatChartValue

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const metas = scatterMetas(data, series)

	const visible = metas.filter((meta) => !hidden.has(meta.index))

	const { plot, xScale, yScale, xTicks, yTicks } = scatterScales({
		visible,
		frameWidth,
		frameHeight,
		axes,
		tickTarget: metrics.tickTarget,
		pins: { min, max, xMin, xMax },
		format,
		formatX,
	})

	// The sorted unique x values are the scatter's categories: the hover index,
	// snap columns, keyboard cursor, and readout all key on them.
	const uniqueXs = uniqueXValues(visible.map((meta) => meta.points))

	const scaled = xScale !== null && yScale !== null

	const bandPositions = scaled ? uniqueXs.map((x) => xScale.map(x)) : []

	const snapColumns = scaled
		? scatterSnapColumns(
				visible.map((meta) => meta.points),
				uniqueXs,
				yScale.map,
			)
		: []

	const list: ChartScatterSeries[] = scaled
		? visible.map((meta) => ({
				label: meta.label,
				paint: meta.paint,
				marks: scatterMarks(meta.points, xScale.map, yScale.map, meta.radius),
				sized: meta.sized,
				dimmed: emphasis !== null && meta.index !== emphasis,
			}))
		: []

	const allMarks = list.map((entry) => entry.marks)

	const readout = scatterReadout(visible, uniqueXs, format, formatX)

	const rails = resolveCrosshair(crosshair)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const legendItems = scatterLegendItems(metas, legend)

	const marksNode = animate ? (
		<AnimatedScatterChartMarks list={list} />
	) : (
		<ScatterChartMarks list={list} />
	)

	return (
		<ChartFrame
			{...label}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserve={reserve}
			fill={fillFrame}
			aspect={frameAspect}
			legend={
				legendItems && (
					<ChartLegend
						items={legendItems}
						hidden={hidden}
						onToggle={toggle}
						onFocus={setFocus}
						panel={aside}
					/>
				)
			}
			legendPlacement={placement}
			readout={readout}
			tooltip={showTooltip}
			snap={snapTargets(rails, bandPositions, snapColumns)}
			focus={cartesianFocus(bandPositions, snapColumns, 'vertical')}
			className={className}
		>
			<ScatterChrome
				plot={plot}
				axes={axes}
				gridLines={gridLines}
				xScale={xScale}
				yScale={yScale}
				xTicks={xTicks}
				yTicks={yTicks}
			/>

			{rails && (
				<ChartCrosshair
					plot={plot}
					crosshair={rails}
					bandPositions={bandPositions}
					valuePoints={snapColumns}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			{(showTooltip || rails !== null) && bandPositions.length > 0 && (
				<ScatterChartHitArea
					plot={plot}
					centers={bandPositions}
					onData={(x, y) => withinScatterMarks(allMarks, x, y, SCATTER_HIT_SLACK)}
					trigger={trigger}
					snaps={crosshairSnaps(rails)}
				/>
			)}
		</ChartFrame>
	)
}
