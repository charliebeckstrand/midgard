'use client'

import { type RefObject, useMemo } from 'react'
import { cn, toInnerStep } from '../../../core'
import type { FrameReserve, PlotFrameRef } from '../../../hooks'
import { useStableValue } from '../../../hooks/use-stable-value'
import { useDensityStep } from '../../../primitives/density'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import { once } from '../../../utilities'
import type { ChartAxisTick } from './chart-axes/axis'
import { type ChartValueAxisId, resolveAxes } from './chart-axes/schema'
import {
	categoryGridPositionsOf,
	gridPositionsOf,
	referencePositionsOf,
	resolveValueAxes,
} from './chart-cartesian/axes'
import { resolveCategories } from './chart-cartesian/categories'
import {
	cartesianLegendItems,
	type DrawnSeries,
	drawnSeries,
	orderReadout,
	readoutSeriesKey,
	seriesMetas,
} from './chart-cartesian/series'
import { stackModeOf } from './chart-cartesian/stack'
import { CHART_METRICS, GUTTER_LABEL_ROOM, LABEL_CHAR_WIDTH } from './chart-constants'
import { chartFrameLayout, frameFills } from './chart-frame/sizing'
import {
	type BandLabel,
	type CartesianLayout,
	type ChartAxisTitlePlacement,
	horizontalLayout,
	verticalLayout,
} from './chart-layout'
import type { ChartLegendItem, ChartLegendReference } from './chart-legend/legend'
import { legendAside, legendBands, type ResolvedLegend, resolveLegend } from './chart-legend/schema'
import { seriesDataKey } from './chart-motion'
import type { ChartOrientation, PlotRect } from './chart-orientation'
import { type ChartTexture, useChartTexture } from './chart-pattern-defs'
import { referenceLegendItems, ruleKeys } from './chart-reference'
import type { BandScale, LinearScale } from './chart-scale'
import { chartReadout, type SeriesMeta, selectedIndices } from './chart-series'
import { type ChartChrome, type ChartTier, headerLineCount } from './chart-tier'
import { parseInstant } from './chart-time'
import type { CartesianChartProps, ChartReadoutSource, ChartSeries } from './types'
import { useChartFrameSizing } from './use-chart-frame-sizing'
import { useChartReferenceToggle, useChartSeriesToggle } from './use-chart-series-toggle'
import { useChartTextWidth } from './use-chart-text-width'

/**
 * The props of a cartesian entry component that the hook reads. An entry gives
 * the hook all of its props. The header also reaches the frame, and the hook
 * reads it so that the tier reserves the header band.
 *
 * @internal
 */
export type CartesianData<T> = Pick<
	CartesianChartProps<T>,
	| 'data'
	| 'series'
	| 'size'
	| 'width'
	| 'height'
	| 'aspectRatio'
	| 'axes'
	| 'legend'
	| 'onHiddenChange'
	| 'texture'
	| 'reference'
	| 'onCategoryClick'
	| 'selectedCategories'
	| 'formatValue'
	| 'title'
	| 'subtitle'
>

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
	 * The stack draws only positive values, as a stacked bar does: a
	 * non-positive value takes no segment, so it adds nothing to the column. Off,
	 * each value adds to the running total, as a stacked area does.
	 * @defaultValue false
	 */
	stackPositive?: boolean
	/**
	 * Which screen axis the value axis runs along — only {@link BarChart} varies it.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * Order the legend switches by each series' latest value, largest first. They
	 * then read top-to-bottom in the marks' own visible order, rather than the
	 * caller's series order. That is the overlapping lines a {@link LineChart} draws.
	 * Off — the default — keeps the series order, which the drawn order of
	 * grouped bars and stacks must match.
	 * @defaultValue false
	 */
	legendByValue?: boolean
	/**
	 * How far, in px, the chart's widest mark paints past its data coordinate —
	 * see {@link CartesianLayoutInput.markInset}. The layouts reserve it on every
	 * plot edge whenever the axis chrome is off (spark, or an explicit
	 * `axes={false}`). A mark at a data extreme therefore clears the frame, instead
	 * of clipping at it. Bars end at their coordinate, so {@link BarChart} omits it.
	 * @defaultValue 0
	 */
	markInset?: number
	/**
	 * Pixels of clear room to reserve past a data extreme on the value axis — see
	 * {@link CartesianLayoutInput.valueHeadroom}. The hook calls it with the
	 * visible series, because the labels draw for the visible series and a legend
	 * toggle changes them. The line, area, and combo charts set it when they draw
	 * single-series point value labels. The label then sits clear of its edge,
	 * instead of flipping onto the line. Absent, no room is reserved.
	 */
	valueHeadroom?: (visible: readonly SeriesMeta[]) => number
	/**
	 * Where the category axis rules. `'zero'` draws it at the value scale's zero,
	 * which is what a chart whose marks stand on that zero wants. That is bars,
	 * area washes, and a combo. `'edge'`, the default, leaves the rule at the plot
	 * floor. `'zero'` is honored only where {@link CartesianConfig.zeroBaseline}
	 * put zero in the domain. Without it the scale clamps `map(0)` to whichever end
	 * is nearer, and an all-negative domain would rule across the plot ceiling.
	 * @defaultValue 'edge'
	 */
	categoryRule?: 'zero' | 'edge'
}

/** The classes of a category label on the horizontal band axis, as the y axis draws it. @internal */
const BAND_LABEL_CLASS = cn(k.tick)

/** No labels to measure: the band axis is vertical, or it draws none. @internal */
const NO_LABELS: readonly string[] = []

/** Everything the cartesian frame and marks derive from the props. @internal */
export type CartesianChart = {
	ref: PlotFrameRef
	/** Attach to an element around the plot, so that the category labels measure in its font. */
	textHostRef: RefObject<HTMLDivElement | null>
	width: number
	fixedWidth?: number
	height: number
	/** How the plot box reserves its height from its own width, or `null` for a pixel height. */
	reserve: FrameReserve | null
	/**
	 * The plot grows into the height its region holds, rather than reserving one.
	 * Those are the height-measured frames, where a ratio is shared with the legend
	 * or the frame fills a free-form container.
	 */
	fill: boolean
	/**
	 * The whole-chart `width / height` the figure carries as CSS `aspect-ratio`
	 * when the legend shares the aspect box. It is `null` when the plot box holds
	 * the ratio itself, or none is reserved.
	 */
	outerAspect: number | null
	/**
	 * The resolved anatomy tier for the measured plot box. It is the `data-tier`
	 * styling hook a dashboard tile reads. It is also the summary behind the axis /
	 * band / format budgets already folded into the layout below.
	 */
	tier: ChartTier
	/**
	 * How many rows a stacked legend can take before the rest fold into a `+N`
	 * chip. It is the frame tier's `legendRows` budget, threaded to the legend as
	 * its `maxRows`. `0` at spark, but moot there. The frame drops the legend with
	 * the rest of the spark chrome, so it never mounts to read a cap. A side legend
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
	/**
	 * Where the category axis rules, resolved from {@link CartesianConfig.categoryRule}
	 * and gated on a domain that holds zero; `undefined` leaves the rule at the
	 * plot floor.
	 */
	categoryBaseline: number | undefined
	/** The `y2` scale's zero position, for the marks bound to it; the primary baseline when absent. */
	y2Baseline: number
	/** Primary value ticks along the value axis (y when vertical, x when horizontal). */
	yTicks: ChartAxisTick[]
	/** Secondary value ticks along the far side; empty without a `y2` scale. */
	y2Ticks: ChartAxisTick[]
	/** Category labels along the band axis (x when vertical, y when horizontal). */
	xTicks: ChartAxisTick[]
	/** The `legend` prop resolved to its show value, placement, and inert flag. */
	resolvedLegend: ResolvedLegend
	/** The texture defs and the fill of each slot, for the visible series. */
	tex: ChartTexture
	/** Every series, toggled or not — the legend lists them all. */
	metas: SeriesMeta[]
	/**
	 * A signature of every series' values — {@link seriesDataKey} — the animated
	 * marks swap their generation on to replay the reveal out-then-in when the
	 * data changes. It is read off all series, not the visible ones, so a legend
	 * toggle holds it steady. It is derived from the values, not the geometry, so a
	 * resize does too. The static path ignores it.
	 */
	dataKey: string
	/** The series still toggled on — scales, marks, and readout draw these. */
	visible: SeriesMeta[]
	/**
	 * The visible series that take marks, each with the scale and the baseline it
	 * draws through ({@link drawnSeries}). The geometry, the fills, and the value
	 * labels of a chart read this one list, so their indices stay aligned.
	 */
	drawn: DrawnSeries[]
	/** Legend indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles a series on or off by its index. */
	toggleSeries: (index: number) => void
	readout: ChartReadoutSource | null
	/**
	 * The series indices the hover tooltip lists {@link readout}'s rows in — the
	 * marks' own visible top-to-bottom order (a vertical stack reversed, else the
	 * legend's value order). Empty when there is no readout; the readout stays in
	 * series order for the hidden data table.
	 */
	readoutOrder: number[]
	legendItems: ChartLegendItem[] | null
	/** The reference lines' legend chips; the frame shows them only when `legendItems` is not null. */
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
	 * stop, in the same order. The keyboard cursor maps its value lane back through
	 * this to the series it sits on. It can then emphasize that one, and recede the
	 * rest.
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
	 * Each reference line's value-axis position, projected through its own axis's
	 * scale. It is index-aligned to the `reference` prop, so a keyboard stop maps
	 * back to the rule it draws. It is `null` where the value is non-finite (no
	 * rule, no stop), or its scale never resolved.
	 */
	referencePositions: (number | null)[]
	/**
	 * The grid positions along the value axis, per-axis participation already
	 * applied. That is the `y` axis's ticks by default, and `y2`'s on request (or
	 * standing in when no `y` scale resolves). The chart's `grid` switch still
	 * gates the layer.
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
	 * contract, or `undefined` when unset. Pass it to {@link ChartHitArea}'s
	 * `onIndexClick`. Mount the hit area whenever it's set, so the clicks land
	 * even with the tooltip off.
	 */
	onBandClick?: (index: number) => void
	/**
	 * The consumer's `selectedCategories` resolved to data indices, or `null` when
	 * nothing is selected. Pass it to the frame, which lights these data and
	 * recedes the rest.
	 */
	selected: ReadonlySet<number> | null
}

/**
 * The chrome a cartesian chart lays out around its plot inside a stacked
 * aspect-fill figure, for the tier's {@link chartChromeReserve chrome reserve}.
 * That is the header lines, and whether a stacked legend bands below. A side
 * legend never shares the aspect box, so it counts as no stacked band. The
 * legend otherwise shows for two or more series unless forced, the same rule
 * {@link cartesianLegendItems} reads.
 *
 * @internal
 */
function cartesianChrome<T>(props: CartesianData<T>, legend: ResolvedLegend['value']): ChartChrome {
	return {
		headerLines: headerLineCount(props.title, props.subtitle),
		legend: legendBands(legend, props.series.length),
	}
}

/**
 * The drawn category labels of a horizontal chart, which line its left gutter.
 * They are proportional text, so the gutter holds the width that each label
 * draws at, and a label wider than the room is cut with an ellipsis. The tooltip
 * and the data table show the full label. A vertical chart, or a band that
 * draws no labels, measures nothing.
 *
 * @internal
 */
function useHorizontalBandLabel(
	horizontal: boolean,
	drawn: boolean,
	categories: string[],
): { bandLabel: BandLabel | undefined; hostRef: RefObject<HTMLDivElement | null> } {
	const text = useChartTextWidth(
		horizontal && drawn ? categories : NO_LABELS,
		BAND_LABEL_CLASS,
		LABEL_CHAR_WIDTH,
		GUTTER_LABEL_ROOM,
	)

	return { bandLabel: horizontal ? text : undefined, hostRef: text.hostRef }
}

/**
 * The orchestration every cartesian chart shares: density and container
 * sizing, the legend, the texture, the series and readout models, the drawn
 * series, and the value and band scales with their ticks. The oriented
 * scale-and-layout math lives in {@link verticalLayout} / {@link horizontalLayout};
 * this hook picks one by the config's `orientation` and returns its normalized
 * result. Charts add only their geometry and marks, and
 * {@link ChartCartesianFrame} draws the layers around them.
 *
 * @remarks Series binding to the right axis split the domain. Each side's
 * visible series (and the references bound to it) feed its own scale, each
 * formatted by its own axis's formatter. The secondary scale — with its gutter,
 * ticks, and title — exists only while something binds to it.
 * @internal
 */
export function useChartCartesian<T>(
	props: CartesianData<T>,
	config: CartesianConfig<T>,
): CartesianChart {
	const { data, series, size, width, height, aspectRatio = '16/9' } = props

	// The legend prop resolves to its placement / show value and the inert flag.
	// The hook reads the value, and the legend reads the flag.
	const resolvedLegend = resolveLegend(props.legend)

	const legend = resolvedLegend.value

	// The one place the `axes` prop's boolean-or-object union is read: the draw
	// switch, and each axis's config under its own key. Memoized, so the memos
	// below that read an axis config read a value that keeps its identity.
	const { draw, config: axes } = useMemo(() => resolveAxes(props.axes), [props.axes])

	const orientation = config.orientation ?? 'vertical'

	// Rows align by index on one shared band scale, so the category field is
	// only ever read for labels — the first series' xKey names it.
	const xKey = series[0]?.xKey

	// A time axis reads the same category field as a date: the row instants
	// place its calendar ticks, and a date formatter labels the readout to match.
	const timeAxis = axes.x?.type === 'time'

	// Parses every row, so it is memoized like the categories below: a hover, a
	// legend toggle, or a resize commit changes none of its inputs.
	const times = useMemo(
		() => (timeAxis && xKey ? data.map((datum) => parseInstant(datum[xKey])) : undefined),
		[timeAxis, xKey, data],
	)

	const resolvedSize = toInnerStep(useDensityStep(size))

	// The band axis writes dates in the ambient locale's field order, and a time
	// axis floors its week ticks on that locale's first weekday. Outside a
	// `<LocaleProvider>` this is `undefined`, which both fall back to the runtime
	// locale on.
	const { locale } = useLocale()

	const metrics = CHART_METRICS[resolvedSize]

	// A live ratio carries on the figure so a definite-height parent clamps the
	// whole chart (the box-law); a side legend instead keeps the ratio on the plot
	// box and bands beside it. Only the side / stacked distinction needs the prop —
	// a legend shows for two or more series unless it is forced — so it takes no
	// measurement.
	const aside = legendAside(legend)

	const { sizing, outerAspect } = chartFrameLayout(height, aspectRatio, aside)

	// The measured plot box resolves the anatomy tier: the value gutter's compact
	// format and the band-label density from width, the tick count from height,
	// density still capping the ticks. Its budgets fold into the layout below.
	// A stacked aspect-fill figure shares its ratio box with the header and legend,
	// so measuring the plot's remainder for the tier loops — spark drops that
	// chrome, the remainder jumps, the tier flips back. chartFramePolicy resolves
	// it against the figure's own `width / ratio` less the chrome instead.
	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
		policy,
	} = useChartFrameSizing({
		width,
		sizing,
		aside,
		aspect: outerAspect,
		chrome: cartesianChrome(props, legend),
		tickTarget: metrics.tickTarget,
	})

	// Spark stands the axis chrome down to a bare sparkline; every wider tier keeps
	// the caller's `axes` intent. The value gutter, band labels, and titles all
	// gate on this downstream.
	const drawAxes = draw && policy.tier !== 'spark'

	const { hidden, toggle } = useChartSeriesToggle(
		series.map((entry) => entry.yKey),
		props.onHiddenChange,
	)

	// A rule keeps its hide by its key, so a `reference` list that drops a rule
	// leaves each other rule as the reader left it.
	const { hidden: referenceHidden, toggle: toggleReference } = useChartReferenceToggle(
		ruleKeys(props.reference ?? []),
	)

	const stack = config.stack ?? false

	const metas = seriesMetas(data, series, config.swatch, stack)

	// Toggled-off series leave the scales and readout; slot colors stay put
	// because each meta's paint keyed off its original index.
	const visible = metas.filter((meta) => !hidden.has(meta.index))

	// One tile set over every visible slot, so that each filled mark of a chart
	// resolves its fill: the bars and the area washes of a combo alike.
	const tex = useChartTexture(
		props.texture ?? false,
		visible.map((meta) => meta.slot),
	)

	const { value, value2, bandTitle, formatAxisValue } = resolveValueAxes(
		props,
		axes,
		visible,
		stackModeOf(config),
		data,
		referenceHidden,
		policy.compactFormat,
		policy.axisTitles,
		locale,
	)

	// Walks every row to detect a date axis, then again to label it, so it is
	// memoized rather than re-run on every render — a hover, a legend toggle, or
	// a resize commit does not change any of its inputs.
	const { categories, rawCategories, readoutCategory } = useMemo(
		() => resolveCategories(data, xKey, timeAxis, axes.x?.format, locale),
		[data, xKey, timeAxis, axes.x?.format, locale],
	)

	// The public category-activation callback resolved to the hit layer's
	// index-based contract: one mapping here instead of one per chart. It carries
	// the raw category, not the formatted label, so a cross-filter keys off the
	// underlying value the way the time axis's callback already does.
	const { onCategoryClick } = props

	const onBandClick = onCategoryClick
		? (index: number) => onCategoryClick(rawCategories[index] ?? '', index)
		: undefined

	// The held selection keys off the same raw category that a click reports.
	const selected = useMemo(
		() => selectedIndices(rawCategories, props.selectedCategories),
		[rawCategories, props.selectedCategories],
	)

	const bandText = useHorizontalBandLabel(
		orientation === 'horizontal',
		drawAxes && policy.bandAxis !== 'off',
		categories,
	)

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
		bandLabel: bandText.bandLabel,
		bandTitle,
		bandAxis: policy.bandAxis,
		tickRotation: axes.x?.tickRotation ?? false,
		times,
		locale,
		count: data.length,
		markInset: config.markInset,
		valueHeadroom: config.valueHeadroom?.(visible) ?? 0,
		visibleValues: visible.map((meta) => ({
			values: meta.values,
			axis: meta.axis,
			index: meta.index,
		})),
	})

	// A cached thunk, never a value: building the readout formats every category
	// × series cell, which at dense sizes outweighs drawing the marks, so the
	// mount-critical render only decides whether one exists (cheap) and leaves
	// materializing to the first consumer that needs the cells — the tooltip on
	// hover, the deferred table a beat after mount ({@link ChartReadoutSource}).
	//
	// Memoized on the content the cells read, not on the identity of the metas and
	// formatters, which are new on each render. A new thunk on a parent render
	// would reformat every cell of the hidden table, and the deferred table would
	// render the frame a second time. The metas and the formatter are held while
	// the rows, the key of the visible series, the two readout formats, and the
	// locale stay the same, so the memo lists what it reads.
	const readoutInput = useStableValue(
		{
			data,
			key: readoutSeriesKey(visible, series),
			yFormat: axes.y?.format ?? props.formatValue,
			y2Format: axes.y2?.format ?? props.formatValue,
			locale,
			visible,
			formatAxisValue,
		},
		(previous, next) =>
			previous.data === next.data &&
			previous.key === next.key &&
			previous.yFormat === next.yFormat &&
			previous.y2Format === next.y2Format &&
			previous.locale === next.locale,
	)

	const readout = useMemo(
		() =>
			xKey && readoutInput.data.length > 0 && readoutInput.visible.length > 0
				? once(() =>
						chartReadout(
							readoutInput.data,
							xKey,
							readoutInput.visible,
							readoutInput.formatAxisValue,
							readoutCategory,
						),
					)
				: null,
		[readoutInput, xKey, readoutCategory],
	)

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
	// A chip whose rule draws nothing, as outside a pinned domain, recedes nothing.
	const referenceItems = referenceLegendItems(props.reference, formatAxisValue).map((item) =>
		referencePositions[item.index] == null ? { ...item, drawn: false } : item,
	)

	return {
		ref,
		textHostRef: bandText.hostRef,
		width: frameWidth,
		fixedWidth: width,
		height: frameHeight,
		reserve,
		fill: frameFills(sizing),
		outerAspect,
		tier: policy.tier,
		legendRows: policy.legendRows,
		axes: drawAxes,
		plot: layout.plot,
		band: layout.band,
		yScale: layout.valueScale,
		y2Scale: layout.value2Scale,
		baseline: layout.baseline,
		categoryBaseline:
			config.categoryRule === 'zero' && config.zeroBaseline ? layout.baseline : undefined,
		y2Baseline: layout.value2Baseline,
		yTicks: layout.valueTicks,
		y2Ticks: layout.value2Ticks,
		xTicks: layout.bandTicks,
		resolvedLegend,
		tex,
		metas,
		// Read off every series' values, so a legend toggle (which drops a series
		// from `visible`) leaves the key steady and only a real data change swaps it.
		dataKey: seriesDataKey(metas.map((meta) => meta.values)),
		visible,
		// Each visible series draws through its own axis's scale. A series whose
		// scale never resolved takes no marks.
		drawn: drawnSeries({
			visible,
			yScale: layout.valueScale,
			y2Scale: layout.value2Scale,
			baseline: layout.baseline,
			y2Baseline: layout.value2Baseline,
		}),
		hidden,
		toggleSeries: toggle,
		readout,
		readoutOrder,
		legendItems: cartesianLegendItems(metas, legend, config.legendByValue),
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
		selected,
	}
}
