/**
 * The legend schema: the placement and object-form configs a categorical
 * chart's `legend` prop accepts, plus the resolver and the show / side
 * predicates every engine reads.
 */

/**
 * Where a chart's legend sits around the plot: a row above or below it —
 * centered on mobile, justified edge to edge from `sm` — or a column panel
 * beside it, side by side once the chart's own container is wide enough for both
 * and stacked under the plot below that width.
 */
export type ChartLegendPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * The object form of a categorical chart's `legend` prop, naming a `placement`
 * and whether the legend is `inert` together. The bare boolean (show at the
 * default placement, or drop it) and bare placement string still work — the
 * object is only needed to make the legend a static key. An inert legend keeps
 * its swatches and labels but sheds every control: no series toggle, no hover
 * or focus emphasis, and no tab stop — the identity channel without the
 * switchboard. A chart in a dashboard tile being arranged inerts its legend on
 * its own, the same standby its hover takes, so this is for a static legend
 * outside that — a print view, a read-only report.
 */
export type ChartLegendConfig = {
	/**
	 * Where the legend sits around the plot — a row above / below or a side
	 * panel, exactly as the bare placement string.
	 * @defaultValue 'bottom'
	 */
	placement?: ChartLegendPlacement
	/**
	 * Render the legend as a static key: swatches and labels, but no toggle,
	 * emphasis, or tab stop.
	 * @defaultValue false
	 */
	inert?: boolean
}

/** A `legend` prop resolved to what the frame, item logic, and legend each read. @internal */
export type ResolvedLegend = {
	/**
	 * The boolean / placement the show rule reads (`legend ?? seriesCount > 1`)
	 * and the panel/side logic keys off — the object's `placement`, or the bare
	 * value. Carries the `false` / `true` show-hide the placement alone can't.
	 */
	value: boolean | ChartLegendPlacement | undefined
	/** Just the placement, `undefined` for a bare boolean — the frame's `legendPlacement`. */
	placement: ChartLegendPlacement | undefined
	/** The legend renders as a static key. */
	inert: boolean
}

/**
 * Normalizes a categorical chart's `legend` prop — a boolean, a placement
 * string, or a {@link ChartLegendConfig} — to the show `value` the frame and
 * item logic already read, the `placement` alone (a bare boolean resolving to
 * none), and the `inert` flag. The object's `placement` becomes both `value`
 * and `placement` (so `{ placement: 'left' }` places exactly as `'left'` and an
 * object with no placement falls to the default show rule); a bare boolean or
 * string passes through with `inert` off.
 *
 * @internal
 */
export function resolveLegend(
	legend: boolean | ChartLegendPlacement | ChartLegendConfig | undefined,
): ResolvedLegend {
	if (legend !== null && typeof legend === 'object') {
		return { value: legend.placement, placement: legend.placement, inert: legend.inert ?? false }
	}

	return {
		value: legend,
		placement: typeof legend === 'string' ? legend : undefined,
		inert: false,
	}
}

/**
 * Whether a resolved `legend` value shows the legend: an explicit boolean or
 * placement forces it, otherwise it defaults on for two or more entries — the
 * identity channel colour alone must never carry. The one show rule every
 * engine reads.
 *
 * @internal
 */
export function legendVisible(legend: ResolvedLegend['value'], count: number): boolean {
	return Boolean(legend ?? count > 1)
}

/**
 * Whether a resolved `legend` value places the legend down a side (`left` /
 * `right`) rather than along the top or bottom — so it lays out beside the plot
 * and takes the plot's width, not its height.
 *
 * @internal
 */
export function legendAside(legend: ResolvedLegend['value']): boolean {
	return legend === 'left' || legend === 'right'
}

/**
 * Whether the legend bands inside the plot's aspect box: it shows and sits along
 * the top or bottom rather than down a side, so it stacks above or below the
 * plot and costs the tier its chrome reserve. The {@link legendVisible} and
 * {@link legendAside} composite the frame policy reads before resolving the tier.
 *
 * @internal
 */
export function legendBands(legend: ResolvedLegend['value'], count: number): boolean {
	return legendVisible(legend, count) && !legendAside(legend)
}
