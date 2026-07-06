/**
 * The chart module's shared schema: the data structure every chart reads
 * (field keys and series shapes) and the props they hold in common. One place
 * so a chart never redeclares the frame's switches — each chart imports the
 * base and extends the intersection with its own `series` shape and
 * mark-specific props. Internal rendering types derived from this live in
 * `types.ts`.
 */

import type { Step } from '../../recipes'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'
import type { ChartAspectRatio } from './chart-layout'

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
	color?: ChartSeriesColor | (string & {})
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
 * categories, not the series.
 */
export type PieChartSeries<T> = Omit<ChartSeries<T>, 'color'>

/**
 * Where a chart's legend sits around the plot: a centered row above or below
 * it, or a column panel beside it — side by side from `lg`, under the chart
 * below that.
 */
export type ChartLegendPlacement = 'top' | 'bottom' | 'left' | 'right'

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
	/** A short label drawn at the line's far end; omitted, the rule stands alone. */
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
}

/**
 * Selective value labels for a line-bearing chart: direct labels at the points
 * worth naming, so a reader gets the numbers without the tooltip. Both default
 * off; set either (or both). Labels measure first and never clip — an edge
 * label anchors inward — and overlaps resolve by priority, extremes over
 * endpoints, dropping the loser rather than stacking it. The full readout stays
 * in the tooltip and data table.
 */
export type ChartValueLabelConfig = {
	/**
	 * Label each series' first and last point.
	 * @defaultValue false
	 */
	endpoints?: boolean
	/**
	 * Label each series' minimum and maximum point.
	 * @defaultValue false
	 */
	extremes?: boolean
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
	 * @remarks Cartesian charts default to `'16/9'`; pie and donut default to a
	 * square, fitting height to their own content when callout labels are on.
	 */
	aspectRatio?: ChartAspectRatio
	/**
	 * Show the legend. Defaults to on for two or more series (or slices) and off
	 * for one — a single series is already named by the chart's accessible name.
	 * A placement moves it: a centered row under the plot (`'bottom'`, the
	 * default) or above it (`'top'`), or a column panel beside it (`'left'` /
	 * `'right'`), side by side from `lg` and under the chart below that.
	 */
	legend?: boolean | ChartLegendPlacement
	/**
	 * Show the hover tooltip naming the pointed series or slice.
	 * @defaultValue true
	 */
	tooltip?: boolean
	/**
	 * Animate the marks in on mount with Framer Motion, honouring
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
	 * Reference lines drawn across the plot at fixed values — targets, thresholds,
	 * or averages the marks read against. Each value folds into the domain so an
	 * off-data line stays on-frame, and the rules draw over the marks so a mark
	 * crossing one stays legible.
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
