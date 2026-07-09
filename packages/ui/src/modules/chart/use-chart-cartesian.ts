'use client'

import { type FrameReserve, usePlotFrame } from '../../hooks'
import { useResolvedSize } from '../../primitives/density'
import type { Step } from '../../recipes'
import type { ChartAxisTick } from './chart-axis'
import { CHART_METRICS } from './chart-constants'
import {
	type CartesianLayout,
	type ChartAxisTitlePlacement,
	type ChartValueAxisInput,
	chartFrameLayout,
	horizontalLayout,
	type PlotRect,
	verticalLayout,
} from './chart-layout'
import type { ChartLegendItem, ChartLegendReference } from './chart-legend'
import { seriesDataKey } from './chart-motion'
import type { ChartOrientation } from './chart-orientation'
import { referenceLegendItems } from './chart-reference-lines'
import { type BandScale, bandBoundaries, type LinearScale } from './chart-scale'
import {
	type CartesianAxes,
	type CartesianChartProps,
	type ChartReferenceLine,
	type ChartSeries,
	type ChartValueAxisId,
	resolveAxes,
} from './chart-schema'
import {
	chartReadout,
	formatChartValue,
	formatChartValueCompact,
	paintSlot,
	rawColor,
	type SeriesMeta,
	seriesPaint,
	seriesValues,
	textClass,
} from './chart-series'
import {
	type ChartChrome,
	type ChartTier,
	chartPolicy,
	headerLineCount,
	policyPlotHeight,
} from './chart-tier'
import { dateCategoryFormat, parseInstant, timeCategory } from './chart-time'
import type { ChartReadout } from './types'
import { useChartReferenceToggle, useChartSeriesToggle } from './use-chart-series-toggle'

/** The cartesian props minus the accessible name, which stays with the frame. @internal */
export type CartesianData<T> = Omit<CartesianChartProps<T>, 'aria-label' | 'aria-labelledby'>

/** Per-chart configuration for {@link useChartCartesian}. @internal */
export type CartesianConfig<T> = {
	/** Anchor the value domains at zero — bar-bearing charts. */
	zeroBaseline: boolean
	/** The legend / tooltip swatch mirroring each series' mark. */
	swatch: (series: ChartSeries<T>, index: number) => 'rect' | 'line'
	/**
	 * Scale the value axis to the per-category sum of the visible series rather
	 * than their individual values — the stacked-area domain.
	 * @defaultValue false
	 */
	stack?: boolean
	/**
	 * Which screen axis the value axis runs along — only {@link BarChart} varies it.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * Order the legend switches by each series' latest value, largest first, so
	 * they read top-to-bottom in the marks' own visible order rather than the
	 * caller's series order — the overlapping lines a {@link LineChart} draws.
	 * Off — the default — keeps the series order, which the drawn order of
	 * grouped bars and stacks must match.
	 * @defaultValue false
	 */
	legendByValue?: boolean
	/**
	 * How far, in px, the chart's widest mark paints past its data coordinate —
	 * see {@link CartesianLayoutInput.markInset}. The layouts reserve it on every
	 * plot edge whenever the axis chrome is off (spark, or an explicit
	 * `axes={false}`), so a mark at a data extreme clears the frame instead of
	 * clipping at it. Bars end at their coordinate, so {@link BarChart} omits it.
	 * @defaultValue 0
	 */
	markInset?: number
	/**
	 * Pixels of clear room to reserve past a data extreme on the value axis — see
	 * {@link CartesianLayoutInput.valueHeadroom}. The line-bearing charts set it
	 * when they draw single-series extreme value labels, so the label sits clear
	 * of its edge instead of flipping onto the line.
	 * @defaultValue 0
	 */
	valueHeadroom?: number
}

/** Everything the cartesian frame and marks derive from the props. @internal */
export type CartesianChart = {
	ref: ReturnType<typeof usePlotFrame>['ref']
	width: number
	fixedWidth?: number
	height: number
	/** How the plot box reserves its height from its own width, or `null` for a pixel height. */
	reserve: FrameReserve | null
	/**
	 * The plot grows into the height its region holds rather than reserving one —
	 * the height-measured frames, where a ratio is shared with the legend or the
	 * frame fills a free-form container.
	 */
	fill: boolean
	/**
	 * The whole-chart `width / height` the figure carries as CSS `aspect-ratio`
	 * when the legend shares the aspect box; `null` when the plot box holds the
	 * ratio itself or none is reserved.
	 */
	outerAspect: number | null
	/**
	 * The resolved anatomy tier for the measured plot box — the `data-tier` styling
	 * hook a dashboard tile reads, and the summary behind the axis / band / format
	 * budgets already folded into the layout below.
	 */
	tier: ChartTier
	/**
	 * How many rows a stacked legend may take before the rest fold into a `+N`
	 * chip — the frame tier's `legendRows` budget, threaded to the legend as its
	 * `maxRows`. `0` at spark, but moot there: the frame drops the legend with the
	 * rest of the spark chrome, so it never mounts to read a cap. A side legend
	 * paginates and ignores this.
	 */
	legendRows: 0 | 1 | 2
	/**
	 * Whether the axis chrome draws: the caller's `axes` intent, stood down at the
	 * spark tier so a bare sparkline shows its marks alone. The value gutter, band
	 * labels, and titles all gate on it downstream.
	 */
	axes: boolean
	plot: PlotRect
	band: BandScale
	/** The primary (`y`) value scale; `null` when nothing yields its domain — render the empty frame. */
	yScale: LinearScale | null
	/** The secondary (`y2`) value scale; `null` while nothing binds to that axis. */
	y2Scale: LinearScale | null
	/** The primary zero line's position along the value axis, for bar baselines and the category axis. */
	baseline: number
	/** The `y2` scale's zero position, for the marks bound to it; the primary baseline when absent. */
	y2Baseline: number
	/** Primary value ticks along the value axis (y when vertical, x when horizontal). */
	yTicks: ChartAxisTick[]
	/** Secondary value ticks along the far side; empty without a `y2` scale. */
	y2Ticks: ChartAxisTick[]
	/** Category labels along the band axis (x when vertical, y when horizontal). */
	xTicks: ChartAxisTick[]
	/** Every series, toggled or not — the legend lists them all. */
	metas: SeriesMeta[]
	/**
	 * A signature of every series' values — {@link seriesDataKey} — the animated
	 * marks swap their generation on to replay the reveal out-then-in when the
	 * data changes. Read off all series, not the visible ones, so a legend toggle
	 * holds it steady; derived from the values, not the geometry, so a resize does
	 * too. The static path ignores it.
	 */
	dataKey: string
	/** The series still toggled on — scales, marks, and readout draw these. */
	visible: SeriesMeta[]
	/** Legend indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles a series on or off by its index. */
	toggleSeries: (index: number) => void
	/** The legend-emphasised series, when it is visible; other marks dim. */
	emphasis: number | null
	/** Moves the legend emphasis (`null` clears it). */
	setEmphasis: (index: number | null) => void
	readout: ChartReadout | null
	/**
	 * The series indices the hover tooltip lists {@link readout}'s rows in — the
	 * marks' own visible top-to-bottom order (a vertical stack reversed, else the
	 * legend's value order). Empty when there is no readout; the readout stays in
	 * series order for the hidden data table.
	 */
	readoutOrder: number[]
	legendItems: ChartLegendItem[] | null
	/** The reference lines' legend chips, when the legend shows; empty otherwise. */
	referenceItems: ChartLegendReference[]
	/** Reference indexes toggled off — their rules are pulled and their chips struck through. */
	referenceHidden: ReadonlySet<number>
	/** Toggles a reference rule on or off by its index in the `reference` array. */
	toggleReference: (index: number) => void
	/** Per category, the band-axis center — a crosshair and tooltip band snap. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — a value crosshair's snap targets. */
	snapPoints: number[][]
	/**
	 * Per category, the series index behind each {@link CartesianChart.snapPoints}
	 * stop, in the same order — the keyboard cursor maps its value lane back through
	 * this to the series it sits on, so it can emphasise that one and recede the rest.
	 */
	snapSeries: number[][]
	/**
	 * Whether the {@link CartesianConfig.valueHeadroom} asked for was affordable
	 * in the resolved layout — see {@link CartesianLayout.valueLabelRoom}. A
	 * chart that reserved room for its point value labels draws them only while
	 * this holds; `true` when no headroom was asked.
	 */
	valueLabelRoom: boolean
	/**
	 * Each reference line's value-axis position — projected through its own
	 * axis's scale — index-aligned to the `reference` prop so a keyboard stop
	 * maps back to the rule it draws; `null` where the value is non-finite (no
	 * rule, no stop) or its scale never resolved.
	 */
	referencePositions: (number | null)[]
	/**
	 * The grid positions along the value axis, per-axis participation already
	 * applied — the `y` axis's ticks by default, `y2`'s on request (or standing
	 * in when no `y` scale resolves). The chart's `grid` switch still gates the
	 * layer.
	 */
	gridPositions: number[]
	/**
	 * The band-axis positions for the category dividers — one per boundary between
	 * adjacent rows, none at the ends. Empty unless the category axis sets a
	 * `separator`, and gated by the same tier switch as {@link CartesianChart.gridPositions}.
	 */
	categoryGridPositions: number[]
	/** The category axis's divider style, driving the dividers' dash; `undefined` draws none. */
	categorySeparator?: 'solid' | 'dashed'
	/** The value- and band-axis titles the layout placed; empty without titles. */
	axisTitles: ChartAxisTitlePlacement[]
	/** Formats a value with its axis's formatter — the readout, labels, and reference rules share it. */
	formatAxisValue: (value: number, axis: ChartValueAxisId) => string
	/** Which way the chart faces — the frame parts read it to draw the transpose. */
	orientation: ChartOrientation
	/**
	 * The consumer's `onCategoryClick` resolved to the hit layer's index-based
	 * contract, or `undefined` when unset — pass to {@link ChartHitArea}'s
	 * `onIndexClick`, and mount the hit area whenever it's set so the clicks
	 * land even with the tooltip off.
	 */
	onBandClick?: (index: number) => void
}

/**
 * Each reference line's value-axis position, projected through its own axis's
 * scale and index-aligned to the prop so a keyboard stop maps back to the rule
 * {@link ChartReferenceLines} draws for it. A non-finite value, an axis with no
 * resolved scale, or a rule toggled off through its legend chip holds its slot
 * with `null`, drawing no rule and offering no stop.
 *
 * @internal
 */
function referencePositionsOf(
	reference: ChartReferenceLine[] | undefined,
	scales: Record<ChartValueAxisId, LinearScale | null>,
	hidden: ReadonlySet<number>,
): (number | null)[] {
	return (reference ?? []).map((line, index) => {
		const scale = scales[line.axis ?? 'y']

		return scale && Number.isFinite(line.value) && !hidden.has(index) ? scale.map(line.value) : null
	})
}

/** The one axis a stack binds to: the axis every series agrees on, else `y`. @internal */
function stackAxisOf<T>(series: ChartSeries<T>[]): ChartValueAxisId {
	const first = series[0]?.axis ?? 'y'

	return series.every((entry) => (entry.axis ?? 'y') === first) ? first : 'y'
}

/** Every series resolved to its meta: label, paint, swatch, values, and axis binding. @internal */
function seriesMetas<T>(
	data: T[],
	series: ChartSeries<T>[],
	swatch: CartesianConfig<T>['swatch'],
	stack: boolean,
): SeriesMeta[] {
	const stackAxis = stackAxisOf(series)

	return series.map((entry, index) => {
		const paint = seriesPaint(entry, index)

		return {
			index,
			label: entry.yName ?? entry.yKey,
			paint,
			slot: paintSlot(paint),
			swatch: swatch(entry, index),
			values: seriesValues(data, entry.yKey),
			// A stack reads as one part-to-whole column, so every series binds to the
			// stack's one axis rather than splitting segments across two domains.
			axis: stack ? stackAxis : (entry.axis ?? 'y'),
			dashed: entry.dashed,
		}
	})
}

/**
 * One axis's domain candidates: its visible series' values — the per-category
 * stack sums where stacked — plus the reference values bound to it, folded in
 * the way min / max pins are so an off-data target line stays inside the frame.
 * A reference toggled off through its chip drops out with the series switched
 * off beside it, so the axis rescales to what is still drawn.
 *
 * @internal
 */
function domainValuesFor<T>(args: {
	axis: ChartValueAxisId
	visible: SeriesMeta[]
	stack: boolean
	data: T[]
	reference: ChartReferenceLine[] | undefined
	referenceHidden: ReadonlySet<number>
}): number[] {
	const { axis, visible, stack, data, reference, referenceHidden } = args

	const bound = visible.filter((meta) => meta.axis === axis)

	// Stacked charts scale to the per-category column totals; every other chart
	// scales to the individual values.
	const values = stack
		? bound.length > 0
			? data.map((_, index) => bound.reduce((sum, meta) => sum + (meta.values[index] ?? 0), 0))
			: []
		: bound.flatMap((meta) => meta.values.filter((value): value is number => value !== null))

	const referenceValues = (reference ?? [])
		.map((line, index) => ({ line, index }))
		.filter(({ line, index }) => (line.axis ?? 'y') === axis && !referenceHidden.has(index))
		.map(({ line }) => line.value)

	return values.concat(referenceValues)
}

/** The per-axis formatters and layout inputs resolved from the chart props. @internal */
type ResolvedValueAxes = {
	value?: ChartValueAxisInput
	value2?: ChartValueAxisInput
	/** The category axis's title, gated on the tier affording a title band. */
	bandTitle?: string
	formatAxisValue: (value: number, axis: ChartValueAxisId) => string
}

/** One axis's tick and readout formatters. @internal */
type AxisFormatters = {
	/** The value gutter's labels — the compact default in a narrow frame. */
	tick: (value: number) => string
	/** The tooltip, hidden table, and reference rules — always full precision. */
	readout: (value: number) => string
}

/**
 * One axis's tick and readout formatters: an explicit per-axis or chart
 * `format` wins for both; absent, the tick labels take `tickDefault` (compact in
 * a narrow frame) while the readout keeps {@link formatChartValue}'s full
 * precision.
 *
 * @internal
 */
function axisFormatters(
	explicit: ((value: number) => string) | undefined,
	tickDefault: (value: number) => string,
): AxisFormatters {
	return { tick: explicit ?? tickDefault, readout: explicit ?? formatChartValue }
}

/**
 * Resolves both value axes from the `axes` config and the frame's tier budget:
 * each axis's domain candidates and pins, its `format` (winning over the
 * chart's `formatValue`), its tick and readout formatters, and its title. Two
 * formatters per axis, not one: the tick labels
 * take the compact default in a narrow frame (`compactFormat`) while the readout
 * — tooltip, hidden table, reference rules — always reads full precision, so a
 * gutter stays cheap without coarsening the numbers a reader opens the tooltip
 * for; an explicit `format` / `formatValue` overrides both. Titles resolve only
 * when the tier affords them (`axisTitles`), so a narrow frame reserves no title
 * band.
 *
 * @internal
 */
function resolveValueAxes<T>(
	props: CartesianData<T>,
	axes: Partial<CartesianAxes>,
	visible: SeriesMeta[],
	stack: boolean,
	data: T[],
	referenceHidden: ReadonlySet<number>,
	compactFormat: boolean,
	axisTitles: boolean,
): ResolvedValueAxes {
	// The tick labels take the compact default in a narrow frame; the readout keeps
	// full precision. An explicit per-axis or chart formatter wins for both.
	const tickDefault = compactFormat ? formatChartValueCompact : formatChartValue

	const y = axisFormatters(axes.y?.format ?? props.formatValue, tickDefault)

	const y2 = axisFormatters(axes.y2?.format ?? props.formatValue, tickDefault)

	const yDomainValues = domainValuesFor({
		axis: 'y',
		visible,
		stack,
		data,
		reference: props.reference,
		referenceHidden,
	})

	const y2DomainValues = domainValuesFor({
		axis: 'y2',
		visible,
		stack,
		data,
		reference: props.reference,
		referenceHidden,
	})

	// The y2 axis exists only while something binds to it — a visible y2-bound
	// series, a y2 reference, or a domain pin — so a single-axis chart never
	// reserves the gutter.
	const hasY2Axis =
		y2DomainValues.length > 0 ||
		visible.some((meta) => meta.axis === 'y2') ||
		axes.y2?.min !== undefined ||
		axes.y2?.max !== undefined

	// The y axis stands down the same way once everything binds y2; with no y2
	// axis it stays on as the default home, so an empty chart still frames its
	// value axis.
	const hasYAxis =
		!hasY2Axis ||
		yDomainValues.length > 0 ||
		visible.some((meta) => meta.axis === 'y') ||
		axes.y?.min !== undefined ||
		axes.y?.max !== undefined

	return {
		value: hasYAxis
			? {
					domainValues: yDomainValues,
					min: axes.y?.min,
					max: axes.y?.max,
					format: y.tick,
					title: axisTitles ? axes.y?.title : undefined,
				}
			: undefined,
		value2: hasY2Axis
			? {
					domainValues: y2DomainValues,
					min: axes.y2?.min,
					max: axes.y2?.max,
					format: y2.tick,
					title: axisTitles ? axes.y2?.title : undefined,
				}
			: undefined,
		bandTitle: axisTitles ? axes.x?.title : undefined,
		formatAxisValue: (value, axis) => (axis === 'y2' ? y2.readout(value) : y.readout(value)),
	}
}

/**
 * The grid positions along the value axis: each axis contributes its ticks
 * while its `grid` flag holds — `y` on by default, `y2` standing in only when
 * no `y` scale resolves — so one hairline layer serves both axes. The tier's
 * grid gate stands the whole layer down at spark, where the value ticks are
 * already gone.
 *
 * @internal
 */
function gridPositionsOf(
	axes: Partial<CartesianAxes>,
	layout: CartesianLayout,
	grid: boolean,
): number[] {
	if (!grid) return []

	const yGrid = (axes.y?.grid ?? true) && layout.valueScale !== null

	const y2Grid = (axes.y2?.grid ?? layout.valueScale === null) && layout.value2Scale !== null

	// De-duplicated: two independent scales can land ticks on one position —
	// both domains' floors map to the plot edge — and one hairline is enough.
	return [
		...new Set([
			...(yGrid ? layout.valueTicks.map((tick) => tick.at) : []),
			...(y2Grid ? layout.value2Ticks.map((tick) => tick.at) : []),
		]),
	]
}

/**
 * The band-axis divider positions — one per boundary between adjacent rows, none
 * at the ends — when the category axis sets a `separator`. Gated by the same tier
 * grid switch as the value grid, so the dividers stand down together with the
 * rest of the chrome at spark; empty otherwise.
 *
 * @internal
 */
function categoryGridPositionsOf(
	axes: Partial<CartesianAxes>,
	layout: CartesianLayout,
	count: number,
	grid: boolean,
): number[] {
	if (!(axes.x?.separator && grid)) return []

	return bandBoundaries(layout.band, count)
}

/** The category labels, their raw forms, and the readout formatter. @internal */
type ResolvedCategories = {
	/** The band-axis labels — formatted when a formatter resolved, else raw. */
	categories: string[]
	/** The raw `String`-coerced values, which the click callback keys off. */
	rawCategories: string[]
	/** The tooltip and data table category formatter; `undefined` falls back to `String`. */
	readoutCategory: ((value: unknown) => string) | undefined
}

/**
 * Resolves the band axis's category labels and readout formatter from the raw
 * `xKey` values. An explicit `formatCategory` wins for both the labels and the
 * readout; with none set, a plain axis whose every value parses as a date
 * normalizes itself to `MM-DD` (see {@link dateCategoryFormat}), while a time
 * axis leaves its labels to its own calendar ticks and formats only its
 * readout. The formatter resolves once over every value so a whole-dataset
 * decision — the date normalization's year elision — reads the same for every
 * label.
 *
 * @internal
 */
function resolveCategories<T>(
	data: T[],
	xKey: (keyof T & string) | undefined,
	timeAxis: boolean,
	formatCategory: ((value: unknown) => string) | undefined,
): ResolvedCategories {
	const rawValues = xKey ? data.map((datum) => datum[xKey]) : []

	const categoryFormat =
		formatCategory ?? (timeAxis ? undefined : (dateCategoryFormat(rawValues) ?? undefined))

	return {
		categories: categoryFormat ? rawValues.map(categoryFormat) : rawValues.map(String),
		rawCategories: rawValues.map(String),
		readoutCategory: categoryFormat ?? (timeAxis ? timeCategory() : undefined),
	}
}

/**
 * The legend entries: on request, or by default once a second series needs
 * telling apart. Opted into `byValue`, the switches list in the marks' visible
 * order — each series by its latest value — while every entry keeps its own
 * index, so the reorder is display-only and a toggle still finds its series.
 *
 * @internal
 */
function legendItemsOf(
	metas: SeriesMeta[],
	legend: CartesianChartProps<unknown>['legend'],
	byValue: boolean | undefined,
): ChartLegendItem[] | null {
	if (!(legend ?? metas.length > 1)) return null

	return orderLegend(metas, byValue).map((meta) => ({
		index: meta.index,
		label: meta.label,
		swatchClass: textClass(meta.paint) ?? '',
		swatchColor: rawColor(meta.paint),
		swatch: meta.swatch,
		dashed: meta.dashed,
		color: meta.slot ?? undefined,
	}))
}

/**
 * The chrome a cartesian chart lays out around its plot inside a stacked
 * aspect-fill figure — the header lines, and whether a stacked legend bands below
 * — for the tier's {@link chartChromeReserve chrome reserve}. A side legend never
 * shares the aspect box, so it counts as no stacked band; the legend otherwise
 * shows for two or more series unless forced, the same rule {@link legendItemsOf}
 * reads.
 *
 * @internal
 */
function cartesianChrome<T>(props: CartesianData<T>, aside: boolean): ChartChrome {
	return {
		headerLines: headerLineCount(props.title, props.subtitle),
		legend: Boolean(props.legend ?? props.series.length > 1) && !aside,
	}
}

/** One visible series resolved to the scale and baseline it draws through. @internal */
export type DrawnSeries = {
	meta: SeriesMeta
	/** The series' own axis's scale — never `null`; an unresolved series drops out instead. */
	scale: LinearScale
	/** The zero position on that scale, where the series' bars grow from. */
	baseline: number
}

/**
 * The visible series paired with the scale and baseline each draws through:
 * a series reads its own axis's scale — the stack's one shared side when
 * `stacked` — and one whose scale never resolved drops out, since it can take
 * no marks. The mark geometry, fills, and value labels all derive from this
 * one list so their indices stay aligned.
 *
 * @internal
 */
export function drawnSeries(chart: CartesianChart): DrawnSeries[] {
	// A stacked chart already carries one shared axis on every meta — `seriesMetas`
	// binds them all to the stack side — so each series reads its own `meta.axis`
	// whether stacked or grouped; no separate stack branch is needed.
	return chart.visible.flatMap((meta) => {
		const scale = meta.axis === 'y2' ? chart.y2Scale : chart.yScale

		const baseline = meta.axis === 'y2' ? chart.y2Baseline : chart.baseline

		return scale ? [{ meta, scale, baseline }] : []
	})
}

/**
 * Every category's band center, shared across a chart's series since they all
 * span the same categories — one array instead of one per series.
 *
 * @internal
 */
export function bandCenters(chart: CartesianChart): number[] {
	return chart.metas[0]?.values.map((_, index) => chart.band.center(index)) ?? []
}

/**
 * Per-series projection callbacks for `barMarks`, read off the drawn list so
 * each bar series maps and grows through its own axis's scale; `fallback`
 * answers an index past the list, which the geometry never emits marks for.
 *
 * @internal
 */
export function barProjection(drawn: DrawnSeries[], fallback: number) {
	return {
		map: (value: number, index: number) => {
			const entry = drawn[index]

			return entry ? entry.scale.map(value) : value
		},
		baseline: (index: number) => drawn[index]?.baseline ?? fallback,
	}
}

/**
 * A series' latest finite value — its position at the right edge, where the
 * eye reads a line's order. A trailing gap falls back to the last real value;
 * an all-null series has none and sinks with negative infinity.
 *
 * @internal
 */
function latestValue(values: (number | null)[]): number {
	for (let index = values.length - 1; index >= 0; index--) {
		const value = values[index]

		if (value != null) return value
	}

	return Number.NEGATIVE_INFINITY
}

/**
 * Orders two series by their latest value, largest first — the legend's
 * visible top-to-bottom order when a chart opts into
 * {@link CartesianConfig.legendByValue}. Equal or all-null series fall back to
 * the caller's order, so the sort stays stable and never returns `NaN`.
 *
 * @internal
 */
function byLatestValue(a: SeriesMeta, b: SeriesMeta): number {
	return latestValue(b.values) - latestValue(a.values) || a.index - b.index
}

/**
 * The metas in legend order: sorted into the marks' visible value order when
 * `byValue` is set, else the caller's series order untouched. The sort runs on
 * a copy, so the list the scales and marks read keeps its series order.
 *
 * @internal
 */
function orderLegend(metas: SeriesMeta[], byValue: boolean | undefined): SeriesMeta[] {
	return byValue ? [...metas].sort(byLatestValue) : metas
}

/**
 * The series indices the tooltip lists its rows in, so the hover readout reads
 * top-to-bottom in the marks' own visible order. The readout itself stays in the
 * caller's series order for the hidden data table; this reorders only the
 * display. A vertical stack piles the first series at the bottom, so its rows
 * reverse — the top segment reads first; a horizontal stack runs first-to-last
 * left to right and keeps the series order. Off a stack the rows take the
 * legend's own {@link orderLegend} order, so overlapping lines read in their
 * drawn value order and the tooltip agrees with the legend.
 *
 * @internal
 */
function orderReadout(
	visible: SeriesMeta[],
	stacked: boolean,
	orientation: ChartOrientation,
	byValue: boolean | undefined,
): number[] {
	if (stacked && orientation === 'vertical') return visible.map((meta) => meta.index).reverse()

	return orderLegend(visible, byValue).map((meta) => meta.index)
}

/**
 * The orchestration every cartesian chart shares: density and container
 * sizing, the series and legend / readout models, and the value and band scales
 * with their ticks. The oriented scale-and-layout math lives in
 * {@link verticalLayout} / {@link horizontalLayout}; this hook picks one by the
 * config's `orientation` and returns its normalized result. Charts add only
 * their geometry and mark renderers on top.
 *
 * @remarks Series binding to the right axis split the domain: each side's
 * visible series (and the references bound to it) feed its own scale, each
 * formatted by its own axis's formatter, and the secondary scale — with its
 * gutter, ticks, and title — exists only while something binds to it.
 * @internal
 */
export function useChartCartesian<T>(
	props: CartesianData<T>,
	config: CartesianConfig<T>,
): CartesianChart {
	const { data, series, size, width, height, aspectRatio = '16/9', legend } = props

	// The one place the `axes` prop's boolean-or-object union is read: the draw
	// switch, and each axis's config under its own key.
	const { draw, config: axes } = resolveAxes(props.axes)

	const orientation = config.orientation ?? 'vertical'

	// Rows align by index on one shared band scale, so the category field is
	// only ever read for labels — the first series' xKey names it.
	const xKey = series[0]?.xKey

	// A time axis reads the same category field as a date: the row instants
	// place its calendar ticks, and a date formatter labels the readout to match.
	const timeAxis = axes.x?.type === 'time'

	const times = timeAxis && xKey ? data.map((datum) => parseInstant(datum[xKey])) : undefined

	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	// A live ratio carries on the figure so a definite-height parent clamps the
	// whole chart (the box-law); a side legend instead keeps the ratio on the plot
	// box and bands beside it. Only the side / stacked distinction needs the prop —
	// a legend shows for two or more series unless it is forced — so it takes no
	// measurement.
	const aside = legend === 'left' || legend === 'right'

	const { sizing, outerAspect } = chartFrameLayout(height, aspectRatio, aside)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	// The measured plot box resolves the anatomy tier: the value gutter's compact
	// format and the band-label density from width, the tick count from height,
	// density still capping the ticks. Its budgets fold into the layout below.
	// A stacked aspect-fill figure shares its ratio box with the header and legend,
	// so measuring the plot's remainder for the tier loops — spark drops that
	// chrome, the remainder jumps, the tier flips back. Resolve it against the
	// figure's own `width / ratio` less the chrome instead; the drawing still fills
	// the measured remainder. A free-form fill frame shares that box with no ratio
	// to derive a safe height from, so the policy's fill flag resolves the
	// chrome-affecting decisions from the width alone.
	const policyHeight = policyPlotHeight(
		frameHeight,
		frameWidth,
		outerAspect,
		cartesianChrome(props, aside),
	)

	const policy = chartPolicy(frameWidth, policyHeight, metrics.tickTarget, sizing.mode === 'fill')

	// Spark stands the axis chrome down to a bare sparkline; every wider tier keeps
	// the caller's `axes` intent. The value gutter, band labels, and titles all
	// gate on this downstream.
	const drawAxes = draw && policy.tier !== 'spark'

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const { hidden: referenceHidden, toggle: toggleReference } = useChartReferenceToggle()

	const stack = config.stack ?? false

	const metas = seriesMetas(data, series, config.swatch, stack)

	// Toggled-off series leave the scales and readout; slot colours stay put
	// because each meta's paint keyed off its original index.
	const visible = metas.filter((meta) => !hidden.has(meta.index))

	const { value, value2, bandTitle, formatAxisValue } = resolveValueAxes(
		props,
		axes,
		visible,
		stack,
		data,
		referenceHidden,
		policy.compactFormat,
		policy.axisTitles,
	)

	const { categories, rawCategories, readoutCategory } = resolveCategories(
		data,
		xKey,
		timeAxis,
		axes.x?.format,
	)

	// The public category-activation callback resolved to the hit layer's
	// index-based contract: one mapping here instead of one per chart. It carries
	// the raw category, not the formatted label, so a cross-filter keys off the
	// underlying value the way the time axis's callback already does.
	const { onCategoryClick } = props

	const onBandClick = onCategoryClick
		? (index: number) => onCategoryClick(rawCategories[index] ?? '', index)
		: undefined

	const layout: CartesianLayout = (
		orientation === 'horizontal' ? horizontalLayout : verticalLayout
	)({
		frameWidth,
		frameHeight,
		axes: drawAxes,
		tickTarget: policy.tickTarget,
		zeroBaseline: config.zeroBaseline,
		value,
		value2,
		categories,
		bandTitle,
		bandAxis: policy.bandAxis,
		tickRotation: props.tickRotation,
		times,
		count: data.length,
		markInset: config.markInset,
		valueHeadroom: config.valueHeadroom,
		visibleValues: visible.map((meta) => ({
			values: meta.values,
			axis: meta.axis,
			index: meta.index,
		})),
	})

	const readout =
		xKey && data.length > 0 && visible.length > 0
			? chartReadout(data, xKey, visible, formatAxisValue, readoutCategory)
			: null

	// The tooltip lists its rows in the marks' visible order (a vertical stack
	// reversed, else the legend's value order); the readout keeps series order for
	// the hidden table. Empty without a readout to order.
	const readoutOrder = readout
		? orderReadout(visible, stack, orientation, config.legendByValue)
		: []

	// Reference lines map onto their own axis's scale the way the rules do, kept
	// aligned to the prop so the keyboard's active-rule index names the rule it
	// draws; a rule toggled off through its chip drops its stop with its rule.
	const referencePositions = referencePositionsOf(
		props.reference,
		{
			y: layout.valueScale,
			y2: layout.value2Scale,
		},
		referenceHidden,
	)

	// Reference chips resolve regardless; the frame mounts the legend — and with
	// it these — only when `legendItems` is non-null, so they join a shown legend
	// and never force one of their own.
	const referenceItems = referenceLegendItems(props.reference, formatAxisValue)

	return {
		ref,
		width: frameWidth,
		fixedWidth: width,
		height: frameHeight,
		reserve,
		fill: sizing.mode === 'fill' || sizing.mode === 'aspect-fill',
		outerAspect,
		tier: policy.tier,
		legendRows: policy.legendRows,
		axes: drawAxes,
		plot: layout.plot,
		band: layout.band,
		yScale: layout.valueScale,
		y2Scale: layout.value2Scale,
		baseline: layout.baseline,
		y2Baseline: layout.value2Baseline,
		yTicks: layout.valueTicks,
		y2Ticks: layout.value2Ticks,
		xTicks: layout.bandTicks,
		metas,
		// Read off every series' values, so a legend toggle (which drops a series
		// from `visible`) leaves the key steady and only a real data change swaps it.
		dataKey: seriesDataKey(metas.map((meta) => meta.values)),
		visible,
		hidden,
		toggleSeries: toggle,
		emphasis,
		setEmphasis: setFocus,
		readout,
		readoutOrder,
		legendItems: legendItemsOf(metas, legend, config.legendByValue),
		referenceItems,
		referenceHidden,
		toggleReference,
		bandPositions: layout.bandPositions,
		snapPoints: layout.snapPoints,
		snapSeries: layout.snapSeries,
		valueLabelRoom: layout.valueLabelRoom,
		referencePositions,
		gridPositions: gridPositionsOf(axes, layout, policy.grid),
		categoryGridPositions: categoryGridPositionsOf(axes, layout, data.length, policy.grid),
		categorySeparator: axes.x?.separator,
		axisTitles: layout.titles,
		formatAxisValue,
		orientation,
		onBandClick,
	}
}
