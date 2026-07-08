/**
 * The chart module's shared schema: the data structure every chart reads
 * (field keys and series shapes) and the props they hold in common. One place
 * so a chart never redeclares the frame's switches — each chart imports the
 * base and extends the intersection with its own `series` shape and
 * mark-specific props. Internal rendering types derived from this live in
 * `types.ts`.
 */

import type { ContextMenuConfig } from '../../components/context-menu'
import type { Step } from '../../recipes'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'
import type { ChartAspectRatio } from './chart-layout'

/** A key of `T` naming the field a chart reads from each datum. */
export type DataKey<T> = keyof T & string

/**
 * A chart's right-click menu configuration: the shared {@link ContextMenuConfig}
 * (custom `items`, `defaultItems`, `position`) plus the chart's own export
 * options.
 */
export type ChartContextMenuConfig = ContextMenuConfig & {
	/**
	 * Include the legend in the downloaded PNG / JPG. Off exports the plot and
	 * header alone, the chart reflowing to fill the space the legend leaves.
	 * @defaultValue true
	 */
	downloadLegend?: boolean
}

/**
 * Which value axis a series or reference line reads against: the primary
 * `'left'` axis or the secondary `'right'` one. The names are identities, not
 * geometry — under `orientation="horizontal"` the transpose puts the primary
 * value axis on the bottom and the secondary on top, and the binding reads the
 * same either way.
 */
export type ChartValueAxisSide = 'left' | 'right'

/**
 * One value axis's own configuration, for a cartesian chart's `leftAxis` /
 * `rightAxis` props: an independent domain, tick formatter, title, and
 * grid-line participation. Two measures of different scale — a count against a
 * currency, a rate against a weight — each read their own axis instead of
 * sharing one domain.
 */
export type ChartValueAxis = {
	/** Domain floor; defaults to this axis's data (and zero on a bar-bearing chart). */
	min?: number
	/** Domain ceiling; defaults to this axis's data maximum. */
	max?: number
	/**
	 * Formats this axis's ticks and its series' tooltip, label, and data-table
	 * values — a currency for the left, a percent for the right.
	 * @defaultValue the chart's `formatValue`
	 */
	format?: (value: number) => string
	/** A short title drawn along the axis, naming the measure it scales. */
	title?: string
	/**
	 * Draw this axis's ticks as the chart's gridlines. One axis should carry
	 * them — two independent tick sets rarely align, and doubled hairlines read
	 * as noise — so the left axis defaults on and the right defaults off,
	 * standing in only when no left-bound series resolves a scale. The chart's
	 * `gridLines` switch still gates the whole layer.
	 * @defaultValue `true` for the left axis, `false` for the right
	 */
	gridLines?: boolean
}

/**
 * One plotted series: the fields it reads and how the legend and tooltip
 * name it.
 *
 * @remarks Values are read as `Number(datum[yKey])`; a non-finite result
 * draws as a gap (line) or an omitted mark (bar) and an em-dash tooltip row,
 * without collapsing the scale.
 */
export type ChartSeries<T> = {
	/**
	 * The field holding each row's category label. Rows align by index on one
	 * shared category axis, so the first series' `xKey` names it; later
	 * entries repeat the key for self-description only.
	 */
	xKey: DataKey<T>
	/** The field holding this series' numeric value. */
	yKey: DataKey<T>
	/**
	 * Legend and tooltip name.
	 * @defaultValue the `yKey` field name
	 */
	yName?: string
	/**
	 * Mark colour override: a named palette slot (rendered through the CVD-safe
	 * slot classes, with its texture tile) or any raw CSS colour string — a hex
	 * like `'#e11d48'`, an `'oklch(…)'`, or any value CSS accepts — applied inline.
	 * A raw colour opts out of the categorical palette, so it carries no texture
	 * tile, the same as a raw-coloured reference line. Defaults to the categorical
	 * slot palette in fixed order, so a series keeps its colour when siblings
	 * toggle.
	 */
	color?: ChartSeriesColor | (string & {})
	/**
	 * The value axis this series reads against. `'right'` binds it to the
	 * secondary axis — its own domain, ticks, and formatter via the chart's
	 * `rightAxis` prop — so a second measure plots at its natural scale beside
	 * the first. A stacked chart reads every series on one axis: the side they
	 * all agree on, else the left.
	 * @defaultValue 'left'
	 */
	axis?: ChartValueAxisSide
	/**
	 * Dash this series' connecting stroke instead of drawing it solid — a second
	 * identity channel beside colour, so two lines sharing one chart tell apart
	 * beyond hue, and stay tellable apart in print or under colour-vision
	 * deficiency. Reuses the reference-line dash, keeping the two dash idioms one
	 * pattern. Only the stroke changes: the series keeps its point markers, legend
	 * chip, tooltip, crosshair snap, and keyboard behaviour, and an area series'
	 * fill wash stays solid under its dashed edge. A bar series has no stroke to
	 * dash, so it ignores this. Under `animate` the draw-on reveal still plays.
	 * @defaultValue false
	 */
	dashed?: boolean
}

/**
 * A combo-chart series also names the mark it draws with; on the one shared
 * value axis the bars sit at the back, the translucent area washes ride over
 * them, and the lines draw on top.
 */
export type ComboChartSeries<T> = ChartSeries<T> & {
	/** Draw this series as bars, as a line, or as a filled area. */
	type: 'bar' | 'line' | 'area'
}

/**
 * The one series a pie or donut sweeps: `xKey` names each slice, `yKey` holds
 * its positive share. No colour override — slice colours follow the
 * categories, not the series — no axis binding, since a pie has none, and no
 * dashed stroke, since a slice is a filled wedge with no connecting line.
 */
export type PieChartSeries<T> = Omit<ChartSeries<T>, 'color' | 'axis' | 'dashed'>

/**
 * One scatter series: numeric fields on both axes, each row one point. Unlike
 * the band-axis charts the x field is read as a number and positioned on a
 * linear scale, so rows need no shared category set, arrive in any order, and
 * may repeat an x value. An optional `sizeKey` adds the bubble encoding.
 *
 * @remarks Both fields are read as `Number(datum[key])`; a non-finite result
 * on either drops the point — never the scale — so agent-generated or
 * otherwise ragged datasets degrade to the points that parse.
 */
export type ScatterChartSeries<T> = {
	/** The field holding each point's numeric x position. */
	xKey: DataKey<T>
	/** The field holding each point's numeric y value. */
	yKey: DataKey<T>
	/**
	 * Legend and tooltip name.
	 * @defaultValue the `yKey` field name
	 */
	yName?: string
	/**
	 * Named mark colour override. Defaults to the categorical slot palette in
	 * fixed order, so a series keeps its colour when siblings toggle.
	 */
	color?: ChartSeriesColor
	/**
	 * The field sizing each point — the bubble encoding. Sizes scale by area
	 * (radii on a square root) between `size` and `maxSize` over this series'
	 * own size extent; a non-finite size keeps the point at the smallest
	 * diameter rather than dropping it.
	 */
	sizeKey?: DataKey<T>
	/**
	 * Tooltip and data-table name for the size measure.
	 * @defaultValue the `sizeKey` field name
	 */
	sizeName?: string
	/**
	 * Smallest bubble diameter, in px.
	 * @defaultValue 8
	 */
	size?: number
	/**
	 * Largest bubble diameter, in px.
	 * @defaultValue 28
	 */
	maxSize?: number
}

/**
 * A bubble series is a scatter series whose size encoding is required: every
 * point carries the third measure `sizeKey` reads.
 */
export type BubbleChartSeries<T> = ScatterChartSeries<T> & {
	/** The field sizing each point; the bubble chart's third measure. */
	sizeKey: DataKey<T>
}

/**
 * Where a chart's legend sits around the plot: a row above or below it —
 * centered on mobile, justified edge to edge from `sm` — or a column panel
 * beside it, side by side once the chart's own container is wide enough for both
 * and stacked under the plot below that width.
 */
export type ChartLegendPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * The kind of legend a colour-scaled chart (heatmap, choropleth) draws — only
 * the continuous `'range'` scale bar today, a placeholder for the discriminant a
 * future binned switchboard would join.
 */
export type ChartRangeLegendType = 'range'

/**
 * The object form of a colour-scaled chart's `legend` prop: the legend `type`
 * (only `'range'` today) with its `placement`, which drives the scale bar's
 * orientation — a `'left'` / `'right'` placement stands the bar vertical beside
 * the plot, a `'top'` / `'bottom'` one lays it horizontal above or below. The
 * prop also takes a bare boolean (show at the default placement, or drop it) or a
 * bare placement string, so the object is only needed to name the type and
 * placement together.
 */
export type ChartRangeLegendConfig = {
	/**
	 * The legend variant. Only the continuous `'range'` scale bar today — a
	 * colour-scaled chart has no categorical switchboard to swap to.
	 * @defaultValue 'range'
	 */
	type?: ChartRangeLegendType
	/**
	 * Where the bar sits around the plot; drives its orientation. A side
	 * placement stands it vertical, a stacked one lays it horizontal.
	 * @defaultValue 'right'
	 */
	placement?: ChartLegendPlacement
}

/**
 * The object form of a cartesian chart's hover crosshair: two rules, both on
 * unless overridden. `x` is the horizontal rule across the value axis, `y` the
 * vertical rule down the category axis; each defaults on, so set one `false` to
 * draw only the other (both `false` draws none). Without `snap` each rule
 * tracks the pointer exactly; with it the pair meets the nearest data point —
 * the horizontal at that point's value, the vertical at its category — and the
 * tooltip rides that same intersection.
 *
 * @remarks The `crosshair` prop also takes `true` as shorthand for both rules.
 */
export type Crosshair = {
	/**
	 * Draw the horizontal rule across the value axis.
	 * @defaultValue true
	 */
	x?: boolean
	/**
	 * Draw the vertical rule down the category axis.
	 * @defaultValue true
	 */
	y?: boolean
	/**
	 * Snap the rules to the nearest data point instead of tracking the pointer.
	 * The tooltip snaps with them: it reads the nearest point — in a multi-series
	 * chart, the line the pointer sits closest to — anywhere in the plot, rather
	 * than only over a mark.
	 * @defaultValue false
	 */
	snap?: boolean
}

/**
 * A crosshair with every rule resolved to a concrete boolean: what a chart
 * actually draws once the `true` shorthand and the both-on base are applied.
 * `null` stands in for a crosshair that draws nothing, letting a chart gate the
 * overlay on one truthy check.
 *
 * @internal
 */
export type ResolvedCrosshair = Required<Crosshair>

/**
 * One reference line: a value-axis annotation drawn across the plot — a target,
 * threshold, budget, or average to read the marks against. It sits at a raw
 * domain `value`, so its position tracks the scale; the value also folds into
 * the domain, keeping an off-data target on-frame rather than clamped to an
 * edge.
 */
export type ChartReferenceLine = {
	/** The domain value the line sits at, in the same units the series are read in. */
	value: number
	/**
	 * A short label naming the rule — carried in its hover tooltip and legend chip,
	 * and drawn beside the rule at its far end once a chart's `labels.references` is
	 * on. Omitted, the rule reads by its value alone.
	 */
	label?: string
	/**
	 * The rule's colour: a named palette slot (rendered through the CVD-safe slot
	 * classes) or any raw CSS colour string — a hex like `'#e11d48'`, an
	 * `'oklch(…)'`, or any value CSS accepts — applied inline. Defaults to the
	 * neutral de-emphasis slot, so a reference reads as chrome until coloured for
	 * emphasis.
	 * @defaultValue 'zinc'
	 */
	color?: ChartSeriesColor | (string & {})
	/**
	 * Dash the rule — the annotation convention, telling a reference apart from a
	 * data line — or draw it solid.
	 * @defaultValue true
	 */
	dashed?: boolean
	/**
	 * The value axis the rule's `value` reads against. It folds into that
	 * axis's domain and draws at that axis's projection, so a right-axis
	 * threshold annotates the right-bound series rather than the left scale.
	 * @defaultValue 'left'
	 */
	axis?: ChartValueAxisSide
}

/**
 * Selective value labels for a line-bearing chart: direct labels at the points
 * worth naming — and, with `references`, beside each reference rule — so a reader
 * gets the numbers without the tooltip. All default off; set any. The full
 * readout stays in the tooltip and data table.
 *
 * `endpoints` and `extremes` apply only to a single-series chart: with more
 * than one series the numbers would crowd between the lines with nowhere
 * reliable to sit, so they stand down and the tooltip carries the readout.
 * When they draw, the chart reserves value-axis room past the data extremes so
 * a label at an edge sits clear of the line instead of flipping onto it; a
 * plot too short to afford that room sheds the point labels whole rather than
 * render them crowded. `references` is unaffected by either rule.
 */
export type ChartValueLabelConfig = {
	/**
	 * Label the first and last point — single-series charts only.
	 * @defaultValue false
	 */
	endpoints?: boolean
	/**
	 * Label the minimum and maximum point — single-series charts only.
	 * @defaultValue false
	 */
	extremes?: boolean
	/**
	 * Draw each reference line's value — prefixed by its label where it has one —
	 * beside the rule at its far end, inked to match the rule. The standing
	 * readout replaces the rule's hover tooltip: with it on, the rules shed their
	 * pointer target and keyboard stop, since the label already reads what the
	 * tooltip would. The visually-hidden reference list keeps the assistive-tech
	 * parity either way.
	 * @defaultValue false
	 */
	references?: boolean
}

/**
 * How the tooltip is summoned: `'hover'` tracks the pointer, the default;
 * `'click'` pins the readout to a click, gives the plot a pointer cursor to read
 * as clickable, and dismisses on a second click of the same mark.
 */
export type ChartTooltipTrigger = 'hover' | 'click'

/**
 * The object form of a chart's `tooltip` prop: the tooltip stays on, its
 * `trigger` choosing how it opens. The prop also takes a bare boolean — `true`
 * for the hover default, `false` to drop the tooltip — so the object is only
 * needed to switch the trigger.
 */
export type ChartTooltipConfig = {
	/**
	 * Whether the readout tracks the pointer (`'hover'`) or waits for a click
	 * (`'click'`).
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
}

/**
 * A `tooltip` prop resolved to concrete switches: whether to mount the readout
 * and which trigger drives it. The both-on base and the `true` shorthand apply
 * here, so a chart reads one shape however the prop was written.
 *
 * @internal
 */
export type ResolvedTooltip = {
	/** Whether the readout mounts at all. */
	show: boolean
	/** How it opens once shown. */
	trigger: ChartTooltipTrigger
}

/**
 * Resolves the `tooltip` prop's boolean-or-object union to a {@link ResolvedTooltip}.
 * `undefined` and `true` are the shown hover default, `false` drops the readout,
 * and the object form is always shown on its own `trigger` (hover when unset).
 *
 * @internal
 */
export function resolveTooltip(tooltip: boolean | ChartTooltipConfig | undefined): ResolvedTooltip {
	if (tooltip === undefined || tooltip === true) return { show: true, trigger: 'hover' }

	if (tooltip === false) return { show: false, trigger: 'hover' }

	return { show: true, trigger: tooltip.trigger ?? 'hover' }
}

/**
 * The props every chart shares: the data plus the frame's sizing, legend,
 * tooltip, and animation switches. Each chart type extends this with its own
 * `series` shape and mark-specific switches — intersect more props on to grow
 * the config.
 *
 * Requires an accessible name (`aria-label` or `aria-labelledby`) — every plot
 * is `role="img"`, so assistive tech needs a name for it.
 *
 * @internal
 */
export type ChartBaseProps<T> = AccessibleName & {
	/** The rows to plot. An empty array renders an empty frame. */
	data: T[]
	/**
	 * A heading drawn above the plot — the chart's own title, distinct from the
	 * accessible name the `role="img"` region carries for assistive tech. It sits
	 * inside the aspect box, so the drawing fills the height it leaves, and
	 * truncates to one line with a reveal tooltip. At the spark tier the header
	 * leaves the flow and shows as a centered overlay on hover or focus, so a
	 * sparkline stays pure marks until a reader asks what it is.
	 */
	title?: string
	/**
	 * A subheading under the {@link ChartBaseProps.title | title}, muted and
	 * smaller — a unit, a period, a caveat. It truncates the same way and shares
	 * the spark header's hover / focus veil.
	 */
	subtitle?: string
	/**
	 * Frame width in px. Omitted, the chart measures its container and fills
	 * it; pass a width for a fixed frame (and for deterministic SSR output).
	 */
	width?: number
	/** Frame height in px; wins over `aspectRatio` when set (a free-form fixed height). */
	height?: number
	/**
	 * Height as a ratio of the width — a `width / height` number, a `"16/9"`
	 * string, or `false` to fall back to the frame's own height policy. Ignored
	 * when an explicit `height` is given.
	 * @remarks A stacked (top / bottom) legend folds into the ratio, so it
	 * describes the whole chart: a legended chart set to `16/9` fills a 16:9 tile
	 * without the band spilling past it, the plot taking the space the band's
	 * natural height leaves. A side (left / right) legend instead bands beside the
	 * plot at its own width, so the ratio describes the plot alone and the drawing
	 * holds it regardless of the panel. It holds through CSS from the width alone —
	 * no container-height measurement — either way. Cartesian charts default to
	 * `'16/9'`; pie and donut default to a square, fitting height to their own
	 * content when callout labels are on.
	 */
	aspectRatio?: ChartAspectRatio
	/**
	 * Show the legend. Defaults to on for two or more series (or slices) and off
	 * for one — a single series is already named by the chart's accessible name.
	 * Forced on for a lone series (or slice), its single entry is still a live
	 * switch: toggling it off empties the chart, and the forced-on legend holds the
	 * switch that brings it back. A placement moves it: a row under the plot
	 * (`'bottom'`, the default) or
	 * above it (`'top'`) — centered on mobile, justified edge to edge from `sm`
	 * — or a column panel beside it (`'left'` / `'right'`), side by side once the
	 * chart's own container is wide enough for both and stacked under the plot
	 * below that width.
	 */
	legend?: boolean | ChartLegendPlacement
	/**
	 * The tooltip naming the pointed series or slice. `true` (the default) tracks
	 * the pointer; `false` drops it. The object form keeps it on and sets how it
	 * opens — `{ trigger: 'hover' }` tracks the pointer, `{ trigger: 'click' }`
	 * pins the readout to a click and gives the plot a pointer cursor, dismissing
	 * on a second click of the same mark.
	 * @defaultValue true
	 */
	tooltip?: boolean | ChartTooltipConfig
	/**
	 * Animate the marks in on mount with Framer Motion — and, where present, the
	 * reference rules rising along the value axis to their values — honouring
	 * `prefers-reduced-motion` through the `ReducedMotion` primitive. Off by
	 * default — a static dashboard of charts stays a plain-SVG tree with no
	 * motion runtime work.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Hatch each series' filled marks with a slot-keyed texture — a second
	 * identity channel beside colour, so bars, areas, and slices stay tellable
	 * apart in print, under severe colour-vision deficiency, or wherever colour is
	 * unreliable. The texture also engages automatically under
	 * `forced-colors` (Windows High Contrast) and print even when this is off,
	 * where the colour channel is already gone; on-screen colour rendering is
	 * never changed by that fallback. Line strokes carry no fill, so a
	 * pure-line series is unaffected.
	 * @defaultValue false
	 */
	texture?: boolean
	/** Formats tick and tooltip values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	/**
	 * The right-click context menu. By default a chart offers Fullscreen (a live,
	 * interactive copy in a large dialog), image downloads (PNG / JPG, legend
	 * included), and — where a data readout exists — Download CSV / Copy data. Pass
	 * a config to add custom `items` (each a `{ label, icon, onSelect }`), place
	 * them `'before'` or `'after'` the defaults, or drop the defaults with
	 * `defaultItems: false`; a separator divides the two groups when both show. Set
	 * `downloadLegend: false` to export images without the legend. `false` disables
	 * the menu, leaving the browser's native one.
	 * @see {@link ChartContextMenuConfig}
	 */
	contextMenu?: ChartContextMenuConfig | false
	className?: string
}

/**
 * The frame switches the cartesian charts (Bar / Line / Area / Combo) add on
 * top of {@link ChartBaseProps}: the axes, gridlines, value-domain pins, and
 * the hover crosshair.
 *
 * @internal
 */
export type CartesianFrameProps = {
	/** Resolves against enclosing Density; sets the default frame height and tick count. */
	size?: Step
	/**
	 * Draw the x and y axes.
	 * @defaultValue true
	 */
	axes?: boolean
	/**
	 * Draw horizontal hairline gridlines at the y ticks.
	 * @defaultValue true
	 */
	gridLines?: boolean
	/**
	 * Draw a hover crosshair. `true` (the shorthand) draws both rules — a
	 * horizontal value rule and a vertical category rule; a {@link Crosshair}
	 * object snaps them to the nearest point (`snap`) or drops one (`x` / `y` set
	 * `false`). Opt-in: nothing is drawn unless set.
	 */
	crosshair?: boolean | Crosshair
	/** Value-domain floor; defaults to the data (and zero for bars). Pin it to compare charts on one scale. */
	min?: number
	/** Value-domain ceiling; defaults to the data maximum. */
	max?: number
	/**
	 * The primary (left) value axis's own configuration — domain pins, tick
	 * formatter, title, gridline participation. Its `min` / `max` win over the
	 * top-level pins and its `format` over `formatValue`, so a dual-axis chart
	 * reads both axes from one prop pair.
	 */
	leftAxis?: ChartValueAxis
	/**
	 * The secondary (right) value axis: an independent scale for the series
	 * bound to it with `axis: 'right'`. The axis appears once a right-bound
	 * series is visible, a reference line reads against it, or its domain is
	 * pinned here; with none of those it stays off and the chart is the
	 * single-axis default. Under `orientation="horizontal"` the transpose
	 * draws it along the top.
	 */
	rightAxis?: ChartValueAxis
	/**
	 * Reference lines drawn across the plot at fixed values — targets, thresholds,
	 * or averages the marks read against. Each value folds into the domain so an
	 * off-data line stays on-frame, and the rules draw over the marks so a mark
	 * crossing one stays legible. Where the legend shows, each rule also names
	 * itself in it as a static identity chip.
	 */
	reference?: ChartReferenceLine[]
	/**
	 * Type the categorical (band) axis. `'time'` reads each row's `xKey` as a
	 * date — a `Date`, epoch milliseconds, or an ISO string (a bare `YYYY-MM-DD`
	 * as a local day) — and lines the axis with calendar-boundary ticks (year,
	 * quarter, month, week, day, hour) chosen against the tick target, each placed
	 * at its true position between the evenly spaced rows and formatted for the
	 * runtime locale through `@internationalized/date`; the tooltip and data table
	 * read the same dates. Rows stay index-aligned, so spacing is uniform — the
	 * ticks track time, the marks track order. Under `orientation="horizontal"`
	 * this types the vertical band axis. Falls back to plain labels when fewer than
	 * two rows carry a parseable, spanning date.
	 * @defaultValue 'category'
	 */
	xAxis?: 'category' | 'time'
	/**
	 * Tilt category labels that would otherwise collide instead of thinning them
	 * to every nth: past that point every label draws, angled, and none are
	 * dropped. Off by default, so an unset chart keeps thinning.
	 * @remarks Vertical orientation only — under `orientation="horizontal"`
	 * category labels already run down the gutter and read straight, so this has
	 * no effect there.
	 * @defaultValue false
	 */
	tickRotation?: boolean
}

/**
 * Props shared by the cartesian charts (Bar / Line / Area): the base plus the
 * cartesian frame switches and the series list. Combo composes the same
 * pieces with its own series type.
 *
 * @internal
 */
export type CartesianChartProps<T> = ChartBaseProps<T> &
	CartesianFrameProps & {
		/** The series to plot, one mark set each; slot colours follow this order. */
		series: ChartSeries<T>[]
	}
