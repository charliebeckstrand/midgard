/**
 * The chart module's shared schema and the internal rendering types the frame
 * derives from it. The schema is the composition root. It holds the data
 * structure every chart reads (field keys and series shapes) and the props they
 * hold in common. Those compose from the per-concept configs that live beside
 * their own modules: axes, legend, tooltip, crosshair, reference lines. One
 * place, so a chart never redeclares the frame's switches. Each chart imports
 * the base, and extends the intersection with its own `series` shape and
 * mark-specific props.
 * The readout types at the foot are internal, derived from the data for the
 * tooltip and data table, and not part of the public schema.
 */

import type { Step } from '../../../recipes'
import type { AccessibleName } from '../../../types'
import type { CartesianAxes, ChartValueAxisId } from './chart-axes/schema'
import type { ChartSeriesColor } from './chart-color/palette'
import type { ChartContextMenuConfig } from './chart-context-menu'
import type { Crosshair } from './chart-crosshair'
import type { ChartAspectRatio } from './chart-layout'
import type { ChartLegendConfig, ChartLegendPlacement } from './chart-legend/schema'
import type { ChartReferenceLine } from './chart-reference-lines'
import type { ChartTooltipConfig } from './chart-tooltip'

/** A key of `T` naming the field a chart reads from each datum. */
export type DataKey<T> = keyof T & string

/**
 * One plotted series: the fields it reads and how the legend and tooltip
 * name it.
 *
 * @remarks Values are read as `Number(datum[yKey])`. A non-finite result draws
 * as a gap (line) or an omitted mark (bar), and an em-dash tooltip row, without
 * collapsing the scale.
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
	 * Mark color override: a named palette slot (rendered through the CVD-safe
	 * slot classes, with its texture tile), or any raw CSS color string applied
	 * inline. That is a hex like `'#e11d48'`, an `'oklch(…)'`, or any value CSS
	 * accepts.
	 * A raw color opts out of the categorical palette, so it carries no texture
	 * tile, the same as a raw-colored reference line. Defaults to the categorical
	 * slot palette in fixed order, so a series keeps its color when siblings
	 * toggle.
	 */
	color?: ChartSeriesColor
	/**
	 * The value axis this series reads against. `'y2'` binds it to the secondary
	 * axis, with its own domain, ticks, and formatter via the chart's `axes.y2`
	 * config. A second measure therefore plots at its natural scale beside the first.
	 * A stacked chart reads every series on one axis: the one they all agree on,
	 * else `y`.
	 * @defaultValue 'y'
	 */
	axis?: ChartValueAxisId
	/**
	 * Dash this series' connecting stroke instead of drawing it solid. It is a
	 * second identity channel beside color, so two lines sharing one chart tell
	 * apart beyond hue. They stay tellable apart in print, or under color-vision
	 * deficiency. Reuses the reference-line dash, keeping the two dash idioms one
	 * pattern. Only the stroke changes. The series keeps its point markers, legend
	 * chip, tooltip, crosshair snap, and keyboard behavior. An area series' fill
	 * wash stays solid under its dashed edge. A bar series has no stroke to
	 * dash, so it ignores this. Under `animate` the draw-on reveal still plays.
	 * @defaultValue false
	 */
	dashed?: boolean
}

/**
 * A combo-chart series also names the mark it draws with. On the one shared
 * value axis the bars sit at the back, the translucent area washes ride over
 * them, and the lines draw on top.
 */
export type ComboChartSeries<T> = ChartSeries<T> & {
	/** Draw this series as bars, as a line, or as a filled area. */
	type: 'bar' | 'line' | 'area'
}

/**
 * The one series a pie or donut sweeps: `xKey` names each slice, `yKey` holds
 * its positive share. There is no color override, because slice colors follow
 * the categories rather than the series. There is no axis binding, since a pie
 * has none. There is no dashed stroke either, since a slice is a filled wedge
 * with no connecting line.
 */
export type PieChartSeries<T> = Omit<ChartSeries<T>, 'color' | 'axis' | 'dashed'>

/**
 * One scatter series: numeric fields on both axes, each row one point. Unlike
 * the band-axis charts the x field is read as a number and positioned on a
 * linear scale. Rows therefore need no shared category set, arrive in any
 * order, and can repeat an x value. An optional `sizeKey` adds the bubble
 * encoding.
 *
 * @remarks Both fields are read as `Number(datum[key])`. A non-finite result on
 * either drops the point, never the scale. Agent-generated or otherwise ragged
 * datasets therefore degrade to the points that parse.
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
	 * Mark color override: a named palette slot (rendered through the CVD-safe
	 * slot classes, with its texture tile), or any raw CSS color string applied
	 * inline. Matches the cartesian series' own `color`. Defaults to the
	 * categorical slot palette in fixed order, so a series keeps its color when
	 * siblings toggle.
	 */
	color?: ChartSeriesColor
	/**
	 * The field sizing each point — the bubble encoding. Sizes scale by area
	 * (radii on a square root) between `size` and `maxSize` over this series' own
	 * size extent. A non-finite size keeps the point at the smallest diameter,
	 * rather than dropping it.
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
 * A click on one item of a chart — a category band, a pie slice, or a map
 * region. It carries the item's own identity and its data index. It is the
 * cross-filter hook: a dashboard toggles a filter on what was clicked, and
 * narrows its neighbors.
 *
 * One shape across the module, so a dashboard wires every chart the same way.
 */
export type ChartItemClick = (id: string, index: number) => void

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
	 * leaves the flow, and shows as a centered overlay on hover or focus. A
	 * sparkline therefore stays pure marks until a reader asks what it is.
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
	 * describes the whole chart. A legended chart set to `16/9` fills a 16:9 tile
	 * without the band spilling past it. The plot takes the space the band's
	 * natural height leaves. A side (left / right) legend instead bands beside the
	 * plot at its own width. The ratio then describes the plot alone, and the
	 * drawing holds it regardless of the panel. It holds through CSS from the width
	 * alone — no container-height measurement — either way. Cartesian charts default to
	 * `'16/9'`; pie and donut default to a square, fitting height to their own
	 * content when callout labels are on.
	 */
	aspectRatio?: ChartAspectRatio
	/**
	 * Show the legend. Defaults to on for two or more series (or slices) and off
	 * for one — a single series is already named by the chart's accessible name.
	 * Forced on for a lone series (or slice), its single entry is still a live
	 * switch. Toggling it off empties the chart, and the forced-on legend holds the
	 * switch that brings it back. A placement moves it:
	 *
	 * - A row under the plot (`'bottom'`, the default) or above it (`'top'`),
	 *   centered at all widths.
	 * - A column panel beside it (`'left'` / `'right'`). It sits side by side once
	 *   the chart's own container is wide enough for both, and stacks under the
	 *   plot below that width.
	 *
	 * The object form ({@link ChartLegendConfig}) names a
	 * `placement` and an `inert` flag together — an inert legend is a static key,
	 * its switches shed.
	 */
	legend?: boolean | ChartLegendPlacement | ChartLegendConfig
	/**
	 * Fires with the set of series indexes the legend has switched off.
	 *
	 * Observation only. The legend owns the set and there is no `hidden` option to
	 * pair with — the same shape `onFullscreenChange` keeps. A click on a legend
	 * entry changed what the reader sees and reported nothing, so the only readout
	 * was a `MutationObserver` over `aria-pressed`. Use it to mirror one chart's
	 * legend onto another, or to persist what a reader switched off. It sits beside
	 * `legend` rather than inside its object form, so `legend={true}` keeps working.
	 * The object form has no way to spell `true`, and a single-series chart that
	 * moved to it would lose the legend the flag forced on. An `inert` legend has
	 * no switches and never fires. The indexes are positions in the chart's own
	 * series or category order.
	 */
	onHiddenChange?: (hidden: ReadonlySet<number>) => void
	/**
	 * The tooltip naming the pointed series or slice. `true` (the default) tracks
	 * the pointer; `false` drops it. The object form keeps it on and sets how it
	 * opens. `{ trigger: 'hover' }` tracks the pointer. `{ trigger: 'click' }` pins
	 * the readout to a click and gives the plot a pointer cursor, dismissing on a
	 * second click of the same mark.
	 * @defaultValue true
	 */
	tooltip?: boolean | ChartTooltipConfig
	/**
	 * Animate the marks in on mount with Framer Motion, honoring
	 * `prefers-reduced-motion` through the `ReducedMotion` primitive. Where present,
	 * the reference rules rise along the value axis to their values. Off by
	 * default — a static dashboard of charts stays a plain-SVG tree with no
	 * motion runtime work.
	 *
	 * A change to the underlying data replays that reveal out-then-in. The outgoing
	 * marks run it in reverse: bars shrink to the baseline, lines un-draw, points
	 * pop out, the pie un-sweeps, value labels fade. The new data then reveals
	 * normally, so a re-query (say a dashboard filter change) transitions rather
	 * than snapping. A resize or a legend toggle is not a data
	 * change and updates in place; a reduced-motion preference skips straight to
	 * the new data. Scatter and bubble charts do not replay on a data change.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Hatch each series' filled marks with a slot-keyed texture. It is a second
	 * identity channel beside color. Bars, areas, and slices therefore stay
	 * tellable apart in print, under severe color-vision deficiency, or wherever
	 * color is unreliable. The texture also engages automatically under
	 * `forced-colors`
	 * (Windows High Contrast) and print even when this is off, where the color
	 * channel is already gone. On-screen color rendering is never changed by that
	 * fallback. Line strokes carry no fill, so a
	 * pure-line series is unaffected.
	 * @defaultValue false
	 */
	texture?: boolean
	/** Formats tick and tooltip values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	/**
	 * The right-click context menu. By default a chart offers three groups:
	 *
	 * - Fullscreen, a live interactive copy in a large dialog.
	 * - Image downloads (PNG / JPG, legend included).
	 * - Download CSV / Copy data, where a data readout exists.
	 *
	 * Pass a config to add custom `items` (each a `{ label, icon, onAction }`).
	 * Place them `'before'` or `'after'` the defaults, or drop the defaults with
	 * `defaultItems: false`. A separator divides the two groups when both show. Set
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
	/** Resolves against enclosing Density; sets the tick-count target. */
	size?: Step
	/**
	 * The chart's axes. `true` (the default) draws the value and category axes
	 * at their defaults; `false` drops the axis chrome for a bare-marks plot.
	 * The object form configures each axis under its own key, matching the names a
	 * series' `axis` binding uses. The category axis is `x`
	 * (`{ type, format, separator, title, tickRotation }`), and a value axis is `y` or `y2`
	 * (`{ min, max, format, title, grid }`). An omitted key keeps that axis's
	 * defaults, so a chart names only the axes it tunes.
	 * @defaultValue true
	 * @see {@link CartesianAxes}
	 */
	axes?: boolean | CartesianAxes
	/**
	 * Draw a hover crosshair. `true` (the shorthand) draws both rules: a horizontal
	 * value rule and a vertical category rule. A {@link Crosshair} object snaps
	 * them to the nearest point (`snap`), or drops one (`x` / `y` set `false`).
	 * Opt-in: nothing is drawn unless set.
	 */
	crosshair?: boolean | Crosshair
	/**
	 * Reference lines drawn across the plot at fixed values — targets, thresholds,
	 * or averages the marks read against. Each value folds into the domain, so an
	 * off-data line stays on-frame. The rules draw over the marks, so a mark
	 * crossing one stays legible. Where the legend shows, each rule also names
	 * itself in it as a switch that toggles the rule.
	 */
	reference?: ChartReferenceLine[]
	/**
	 * Fires when a click lands on a category's band, with the category's label and
	 * its data index. The whole band is the target, the same generous hit the
	 * tooltip reads. The cross-filter hook: a dashboard toggles a filter on the
	 * clicked category and narrows its neighbors. Coexists with the tooltip on
	 * either trigger (a `'click'`-triggered readout still pins). It carries a
	 * pointer cursor across the plot, so the marks read as clickable.
	 */
	onCategoryClick?: ChartItemClick
	/**
	 * The categories that read as selected. Their marks keep full strength, and
	 * the marks of each other category recede with the dim of a legend hover. A
	 * hover never re-lights a mark while a selection is held; the tooltip still reads it.
	 *
	 * Pair it with {@link CartesianFrameProps.onCategoryClick | onCategoryClick}
	 * to hold a selection, for example the source of a dashboard cross-filter.
	 * Each value matches the raw category that `onCategoryClick` reports, as text.
	 * An empty list, or no list, selects nothing, and each mark reads at full strength.
	 */
	selectedCategories?: readonly string[]
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
		/** The series to plot, one mark set each; slot colors follow this order. */
		series: ChartSeries<T>[]
	}

/**
 * One readout row: a series with its swatch and the pre-formatted value per
 * category (an em-dash where the datum is non-finite).
 *
 * @internal
 */
export type ChartReadoutRow = {
	/**
	 * The series' index in the caller's list, so the tooltip can tell the
	 * emphasized row from the rest. It is absent on readouts whose rows aren't
	 * series — a pie's slices, a heatmap's rows — where no row is singled out.
	 */
	index?: number
	label: string
	/** Class carrying the series color on `currentColor`; empty for a raw color, which inks inline. */
	swatchClass: string
	/** A raw series color inked inline on the swatch's `currentColor`; unset for a palette slot. */
	swatchColor?: string
	/** Per-category swatch overrides — pie slices, where the color follows the category. */
	swatchClasses?: string[]
	/** Swatch shape, mirroring the mark. */
	swatch: 'rect' | 'line'
	/** Formatted value per category index. */
	values: string[]
}

/**
 * The values a chart exposes off the marks: category labels crossed with one
 * row per series. The tooltip reads one column on hover; the visually-hidden
 * table renders all of it for assistive tech, so no value is gated behind a
 * pointer.
 *
 * @internal
 */
export type ChartReadout = {
	categories: string[]
	rows: ChartReadoutRow[]
}

/**
 * A chart's readout as a cached thunk ({@link once}), not a value. Building one
 * formats every category × series cell through `Intl`, which at dense sizes
 * costs more than drawing the marks. Nothing on the mount-critical render can
 * therefore materialize it. The first consumer that needs the values calls the
 * thunk off that path, and every later reader shares the cache. That consumer
 * is a hover's tooltip, the deferred data table, or a CSV export. A chart that
 * can cheaply tell it has no readout passes `null` in its place. Presence
 * therefore still gates the tooltip and table without a build.
 *
 * @internal
 */
export type ChartReadoutSource = () => ChartReadout | null
