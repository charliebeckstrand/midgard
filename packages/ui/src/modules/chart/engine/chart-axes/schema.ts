/**
 * The axes schema: the value and category axis configs a chart accepts, and the
 * resolver that reads the `axes` prop's boolean-or-object union.
 */

/**
 * Which value axis a series or reference line reads against: the key of the
 * chart's {@link CartesianAxes | axes} object configuring it — the primary
 * `'y'` axis or the secondary `'y2'`. The names are roles, not geometry: `y`
 * lines the left gutter and `y2` the right when vertical, and the transpose
 * under `orientation="horizontal"` moves them to the bottom and top with the
 * binding reading the same either way.
 */
export type ChartValueAxisId = 'y' | 'y2'

/**
 * One value axis's configuration — a `y` / `y2` entry of a cartesian chart's
 * {@link CartesianAxes | axes} object, or either {@link ScatterAxes} entry of a
 * point chart's. An independent domain, tick formatter, title, and grid-line
 * participation, so two measures of different scale — a count against a
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
	 * values — a currency for `y`, a percent for `y2`.
	 * @defaultValue the chart's `formatValue`
	 */
	format?: (value: number) => string
	/** A short title drawn along the axis, naming the measure it scales. */
	title?: string
	/**
	 * Draw this axis's ticks as the chart's grid. On a cartesian chart one axis
	 * should carry them — two independent tick sets rarely align, and doubled
	 * hairlines read as noise — so `y` defaults on and `y2` off, standing in
	 * only when no `y`-bound series resolves a scale; a point chart's grid
	 * reads both ways, so both its axes default on. The chart's `grid` switch
	 * still gates the whole layer.
	 * @defaultValue `true`, except a cartesian chart's `y2`
	 */
	grid?: boolean
}

/**
 * The category (band) axis of a cartesian chart — the `x` entry of its
 * {@link CartesianAxes | axes} object. Types the band axis (plain categories or
 * time), formats its labels, rules its between-category dividers, and titles it.
 */
export type ChartCategoryAxis = {
	/**
	 * Type the band axis. `'time'` reads each row's `xKey` as a date — a `Date`,
	 * epoch milliseconds, or an ISO string (a bare `YYYY-MM-DD` as a local day) —
	 * and lines the axis with calendar-boundary ticks (year, quarter, month, week,
	 * day, hour) chosen against the tick target, each placed at its true position
	 * between the evenly spaced rows and formatted for the runtime locale through
	 * `@internationalized/date`; the tooltip and data table read the same dates.
	 * Rows stay index-aligned, so spacing is uniform — the ticks track time, the
	 * marks track order. Under `orientation="horizontal"` this types the vertical
	 * band axis. Falls back to plain labels when fewer than two rows carry a
	 * parseable, spanning date.
	 * @defaultValue 'category'
	 */
	type?: 'category' | 'time'
	/**
	 * Format each row's category — the band-axis labels and the tooltip and data
	 * table readout — from its raw `xKey` value. Overrides the default `String`
	 * coercion and the automatic date normalization: with no formatter set, a band
	 * axis whose every value parses as a date labels itself `MM-DD` (or
	 * `MM-DD-YYYY` across years) on its own. Ignored on the ticks of a `type: 'time'`
	 * axis, which places and labels its own calendar ticks, though it still formats
	 * that axis's readout.
	 */
	format?: (value: unknown) => string
	/**
	 * Rule a divider between each category — one hairline at every band boundary,
	 * none at the outer edges — so a dense axis reads which marks belong to which
	 * row: `'solid'` or `'dashed'`, omitted draws none. Recessive under the marks
	 * beside the value grid, and it stands down with the rest of the chrome
	 * at the spark tier. Under `orientation="horizontal"` the dividers run between
	 * the stacked bands.
	 */
	separator?: 'solid' | 'dashed'
	/** A short title drawn along the band axis, naming what the categories enumerate. */
	title?: string
}

/**
 * A cartesian chart's axes, one optional config under each axis's own key: the
 * category (band) axis as `x`, the primary value axis as `y`, the secondary as
 * `y2` — the same names a series' or reference line's `axis` binding uses. An
 * omitted key keeps that axis's defaults, so a chart names only the axes it
 * tunes.
 */
export type CartesianAxes = {
	/** The category (band) axis. */
	x?: ChartCategoryAxis
	/** The primary value axis; every series reads it unless bound to `y2`. */
	y?: ChartValueAxis
	/**
	 * The secondary value axis. It appears only once a series binds to it, a
	 * reference reads against it, or its domain is pinned here.
	 */
	y2?: ChartValueAxis
}

/**
 * A point chart's axes (Scatter / Bubble), one optional config per role. Both
 * are value axes here — there is no band axis and no `y2` — so each takes the
 * same domain pins, tick formatter, title, and grid participation.
 */
export type ScatterAxes = {
	/** The horizontal value axis. */
	x?: ChartValueAxis
	/** The vertical value axis. */
	y?: ChartValueAxis
}

/**
 * Reads an `axes` prop's boolean-or-object union: whether the axis chrome draws
 * at all (`false` alone drops it, the bare-marks plot) and the per-axis configs
 * (the booleans read as none — every axis at its defaults).
 *
 * @internal
 */
export function resolveAxes<A extends object>(
	axes: boolean | A | undefined,
): { draw: boolean; config: Partial<A> } {
	return { draw: axes !== false, config: typeof axes === 'object' ? axes : {} }
}
