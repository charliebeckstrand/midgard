/**
 * The chart module's shared schema and the internal rendering types the frame
 * derives from it. The schema is the composition root: the data structure every
 * chart reads (field keys and series shapes) and the props they hold in common,
 * composed from the per-concept configs that live beside their own modules
 * (axes, legend, tooltip, crosshair, reference lines). One place so a chart
 * never redeclares the frame's switches — each chart imports the base and
 * extends the intersection with its own `series` shape and mark-specific props.
 * The readout types at the foot are internal, derived from the data for the
 * tooltip and data table, and not part of the public schema.
 */

import type { Step } from '../../../recipes'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
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
	color?: ChartSeriesColor
	/**
	 * The value axis this series reads against. `'y2'` binds it to the secondary
	 * axis — its own domain, ticks, and formatter via the chart's `axes.y2`
	 * config — so a second measure plots at its natural scale beside the first.
	 * A stacked chart reads every series on one axis: the one they all agree on,
	 * else `y`.
	 * @defaultValue 'y'
	 */
	axis?: ChartValueAxisId
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
	color?: ChartColorSlot
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
	 * below that width. The object form ({@link ChartLegendConfig}) names a
	 * `placement` and an `inert` flag together — an inert legend is a static key,
	 * its switches shed.
	 */
	legend?: boolean | ChartLegendPlacement | ChartLegendConfig
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
	 *
	 * A change to the underlying data replays that reveal out-then-in: the
	 * outgoing marks run it in reverse — bars shrink to the baseline, lines
	 * un-draw, points pop out, the pie un-sweeps, value labels fade — and the new
	 * data then reveals normally, so a re-query (say a dashboard filter change)
	 * transitions rather than snapping. A resize or a legend toggle is not a data
	 * change and updates in place; a reduced-motion preference skips straight to
	 * the new data.
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
	 * The chart's axes. `true` (the default) draws the value and category axes
	 * at their defaults; `false` drops the axis chrome for a bare-marks plot.
	 * The object form configures each axis under its own key — the category
	 * axis as `x` (`{ type, format, separator, title }`), a value axis as `y`
	 * or `y2` (`{ min, max, format, title, grid }`) — matching the names a
	 * series' `axis` binding uses. An omitted key keeps that axis's defaults, so
	 * a chart names only the axes it tunes.
	 * @defaultValue true
	 * @see {@link CartesianAxes}
	 */
	axes?: boolean | CartesianAxes
	/**
	 * Draw a hover crosshair. `true` (the shorthand) draws both rules — a
	 * horizontal value rule and a vertical category rule; a {@link Crosshair}
	 * object snaps them to the nearest point (`snap`) or drops one (`x` / `y` set
	 * `false`). Opt-in: nothing is drawn unless set.
	 */
	crosshair?: boolean | Crosshair
	/**
	 * Reference lines drawn across the plot at fixed values — targets, thresholds,
	 * or averages the marks read against. Each value folds into the domain so an
	 * off-data line stays on-frame, and the rules draw over the marks so a mark
	 * crossing one stays legible. Where the legend shows, each rule also names
	 * itself in it as a static identity chip.
	 */
	reference?: ChartReferenceLine[]
	/**
	 * Fires when a click lands on a category's band — the whole band is the
	 * target, the same generous hit the tooltip reads — with the category's label
	 * and its data index. The cross-filter hook: a dashboard toggles a filter on
	 * the clicked category and narrows its neighbours. Coexists with the tooltip
	 * on either trigger (a `'click'`-triggered readout still pins), and carries a
	 * pointer cursor across the plot so the marks read as clickable.
	 */
	onCategoryClick?: (category: string, index: number) => void
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

/**
 * One readout row: a series with its swatch and the pre-formatted value per
 * category (an em-dash where the datum is non-finite).
 *
 * @internal
 */
export type ChartReadoutRow = {
	/**
	 * The series' index in the caller's list, so the tooltip can tell the
	 * emphasised row from the rest; absent on readouts whose rows aren't series —
	 * a pie's slices, a heatmap's rows — where no row is singled out.
	 */
	index?: number
	label: string
	/** Class carrying the series colour on `currentColor`; empty for a raw colour, which inks inline. */
	swatchClass: string
	/** A raw series colour inked inline on the swatch's `currentColor`; unset for a palette slot. */
	swatchColor?: string
	/** Per-category swatch overrides — pie slices, where the colour follows the category. */
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
 * A chart's readout as a cached thunk ({@link once}), not a value: building
 * one formats every category × series cell through `Intl`, which at dense
 * sizes costs more than drawing the marks — so nothing on the mount-critical
 * render may materialize it. The first consumer that needs the values — a
 * hover's tooltip, the deferred data table, a CSV export — calls the thunk
 * off that path and every later reader shares the cache. A chart that can
 * cheaply tell it has no readout passes `null` in its place, so presence
 * still gates the tooltip and table without a build.
 *
 * @internal
 */
export type ChartReadoutSource = () => ChartReadout | null
