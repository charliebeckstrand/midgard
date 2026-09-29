/**
 * The pure layout of the {@link ScatterChart}. It resolves each series to its
 * points and paint. It also places the plot, the scales, the ticks, and the
 * axis titles that the frame parts read. It holds no React, so the layout is
 * unit-testable in isolation.
 */

import type { ChartAxisTick } from '../engine/chart-axes/axis'
import { legendItemOf } from '../engine/chart-cartesian/series'
import type { ChartPaint } from '../engine/chart-color/paint'
import { seriesPaint } from '../engine/chart-color/palette'
import {
	AXIS_TITLE_BAND,
	AXIS_TITLE_GAP,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	PLOT_TOP_PAD,
	X_AXIS_HEIGHT,
} from '../engine/chart-constants'
import {
	anchorEndTicks,
	diameterRange,
	type ScatterDatum,
	scatterData,
	scatterDrawn,
	sizeDomain,
	sizeRadius,
} from '../engine/chart-geometry/scatter'
import {
	axisTitleAt,
	type ChartAxisTitlePlacement,
	plotRect,
	valueAxisRange,
	valueTicksOf,
} from '../engine/chart-layout'
import type { ChartLegendItem } from '../engine/chart-legend/legend'
import { legendVisible, type ResolvedLegend } from '../engine/chart-legend/schema'
import type { PlotRect } from '../engine/chart-orientation'
import { type LinearScale, linearScale } from '../engine/chart-scale'
import type { ScatterChartSeries } from '../engine/types'

/** One series resolved to everything the frame parts read. @internal */
export type ScatterMeta = {
	index: number
	label: string
	paint: ChartPaint
	/** The shape of the legend swatch. */
	swatch: 'rect'
	/** Every point that parses: the scales, the x columns, and the readout read them. */
	points: ScatterDatum[]
	/** The points that draw a disc: the marks, the hit test, and the keyboard stops read them. */
	drawn: ScatterDatum[]
	sized: boolean
	sizeName: string | null
	radius: (size: number | null) => number
}

/**
 * Every series parsed and resolved: paint, points, and the bubble radius
 * scaling. A series takes its explicit `color` (a palette slot or a raw CSS
 * color), else its slot in the fixed order. {@link seriesPaint} resolves it, as
 * for a cartesian series.
 *
 * @internal
 */
export function scatterMetas<T>(data: T[], series: ScatterChartSeries<T>[]): ScatterMeta[] {
	return series.map((entry, index) => {
		const points = scatterData(data, entry)

		const domain = entry.sizeKey === undefined ? null : sizeDomain(points)

		const diameters = diameterRange(entry.size, entry.maxSize)

		return {
			index,
			label: entry.yName ?? entry.yKey,
			paint: seriesPaint(entry, index),
			swatch: 'rect',
			points,
			// A plain series reads no size, so each of its points draws.
			drawn: entry.sizeKey === undefined ? points : scatterDrawn(points),
			sized: domain !== null,
			sizeName: entry.sizeKey === undefined ? null : (entry.sizeName ?? entry.sizeKey),
			radius: (size) => sizeRadius(size, domain, diameters),
		}
	})
}

/**
 * The legend entries: on request, or by default once a second series needs
 * telling apart. Each entry reads as the entry of a cartesian series does
 * ({@link legendItemOf}).
 *
 * @internal
 */
export function scatterLegendItems(
	metas: ScatterMeta[],
	legend: ResolvedLegend['value'],
): ChartLegendItem[] | null {
	return legendVisible(legend, metas.length) ? metas.map(legendItemOf) : null
}

/** Both scales' pins, lifted off the props. @internal */
type ScatterPins = { min?: number; max?: number; xMin?: number; xMax?: number }

/** The resolved scatter plot: rect, scales, ticks, and placed axis titles. @internal */
type ScatterScales = {
	plot: PlotRect
	xScale: LinearScale | null
	yScale: LinearScale | null
	xTicks: ChartAxisTick[]
	yTicks: ChartAxisTick[]
	/** The x / y axis titles placed in the bands the plot reserved for them; empty without titles. */
	titles: ChartAxisTitlePlacement[]
}

/**
 * The scatter's placed axis titles. A rotated one sits in the left gutter for
 * the y axis, and a horizontal one under the x labels for the x axis. Each sits
 * in the band {@link scatterScales} reserved.
 *
 * @internal
 */
function scatterTitles(
	plot: PlotRect,
	frameWidth: number,
	xTitle: string | undefined,
	yTitle: string | undefined,
): ChartAxisTitlePlacement[] {
	const titles: ChartAxisTitlePlacement[] = []

	if (yTitle) titles.push(axisTitleAt('left', yTitle, plot, frameWidth))

	if (xTitle) titles.push(axisTitleAt('bottom', xTitle, plot, frameWidth))

	return titles
}

/**
 * The inset a spark plot needs on every edge, so its largest disc clears the
 * frame rather than clipping. It is the widest disc radius across the visible
 * points, plus the half of the surface ring that strokes outside that radius.
 * The painted edge — not just the fill — therefore clears. Falls back to the
 * plain {@link MARKER_RADIUS} when
 * there is nothing to measure.
 * @internal
 */
function sparkMarkInset(visible: ScatterMeta[]): number {
	const widest = visible.reduce(
		(outer, meta) =>
			meta.drawn.reduce((inner, point) => Math.max(inner, meta.radius(point.size)), outer),
		MARKER_RADIUS,
	)

	return widest + MARKER_RING_WIDTH / 2
}

/**
 * Both scales resolved, y from the frame height first, so its tick labels can
 * size the left gutter. Then x fills the plot width the labels leave, inset so
 * its extreme discs and end labels clear the frame. The end ticks are then
 * anchored inward, so those labels don't crowd the corner they sit in.
 *
 * @internal
 */
export function scatterScales(args: {
	visible: ScatterMeta[]
	frameWidth: number
	frameHeight: number
	axes: boolean
	/** Spark draws bare marks, so the gutter is reclaimed and the domain fits tight. */
	spark: boolean
	tickTarget: number
	pins: ScatterPins
	format: (value: number) => string
	formatX: (value: number) => string
	/** The x / y axis titles; each reserves a band past its labels where the tier affords one. */
	xTitle?: string
	yTitle?: string
}): ScatterScales {
	const { visible, frameWidth, frameHeight, axes, spark, tickTarget, pins, format, formatX } = args

	const drawAxes = axes && !spark

	// A titled axis reserves a band past its labels — the x title under the x-axis
	// band, the y title rotated at the far left — folded into the plot the way the
	// cartesian layout folds its own.
	const xTitle = drawAxes ? args.xTitle : undefined

	const yTitle = drawAxes ? args.yTitle : undefined

	const xTitleBand = xTitle ? AXIS_TITLE_BAND : 0

	const yTitleBand = yTitle ? AXIS_TITLE_BAND + AXIS_TITLE_GAP : 0

	// A spark scatter fits its domain tight — like a spark line, filling the box
	// rather than sinking into the empty air a nice-stepped scale leaves — and
	// insets every edge by the widest disc's radius so the marks read centered and
	// clear the frame instead of clipping at it. A framed plot keeps the axis
	// reservations: the ceiling tick's top pad and the x-axis band down the value
	// axis, the gutter and end-label inset across.
	const scaleTicks = spark ? 0 : tickTarget

	const inset = spark ? sparkMarkInset(visible) : 0

	const yScale = linearScale({
		values: visible.flatMap((meta) => meta.points.map((point) => point.y)),
		range: [
			frameHeight - (drawAxes ? X_AXIS_HEIGHT + xTitleBand : inset),
			spark ? inset : PLOT_TOP_PAD,
		],
		tickTarget: scaleTicks,
		min: pins.min,
		max: pins.max,
	})

	const yTicks = valueTicksOf(yScale, format)

	const base = plotRect(
		frameWidth,
		frameHeight,
		drawAxes,
		yTicks.map((tick) => tick.label),
	)

	// The title bands narrow the plot from the base gutter / axis-band reservation
	// the way the yScale range already dropped the x title's height.
	const plot: PlotRect = {
		x: base.x + yTitleBand,
		y: base.y,
		width: Math.max(0, base.width - yTitleBand),
		height: Math.max(0, base.height - xTitleBand),
	}

	const xValues = visible.flatMap((meta) => meta.points.map((point) => point.x))

	const xOptions = { tickTarget: scaleTicks, min: pins.xMin, max: pins.xMax }

	const span: [number, number] = spark ? [inset, frameWidth - inset] : [plot.x, plot.x + plot.width]

	// The framed x range insets so the extreme discs and end labels clear the frame;
	// the end ticks then read inward off that range so their labels don't crowd the
	// y floor label at the origin or butt the frame at the far end. Spark draws no
	// axis, so its ticks stay bare and centered over the tight-fit span.
	const xProbe = drawAxes ? linearScale({ values: xValues, range: span, ...xOptions }) : null

	const xRange = xProbe ? valueAxisRange([{ ticks: xProbe.ticks, format: formatX }], span) : span

	const xScale = linearScale({ values: xValues, range: xRange, ...xOptions })

	const xTicks = valueTicksOf(xScale, formatX)

	return {
		plot,
		xScale,
		yScale,
		xTicks: drawAxes ? anchorEndTicks(xTicks, xRange[0], xRange[1]) : xTicks,
		yTicks,
		titles: scatterTitles(plot, frameWidth, xTitle, yTitle),
	}
}
