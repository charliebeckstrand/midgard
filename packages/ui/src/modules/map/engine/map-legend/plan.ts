/**
 * The map's legend resolution, kept off {@link MapPlat} so the component stays
 * a thin assembly. It decides whether the legend shows, where it sits, and
 * whether the binned switchboard or the continuous range bar paints it. Pure —
 * every input arrives resolved, so the rules are testable without a frame.
 */

import type { ChartRangeLegendConfig } from '../../../chart/engine/chart-legend/range'
import { resolveRangeLegend } from '../../../chart/engine/chart-legend/range'
import type { RangeOrientation, RangeScale } from '../../../chart/engine/chart-legend/range-legend'
import { resolveValueFormat } from '../map-region/value'
import type { MapLegendPlacement } from '../types'

/**
 * The map's `legend` prop:
 *
 * - The switchboard's boolean / placement.
 * - The `'range'` discriminator that swaps in the continuous scale bar.
 * - The object form `{ placement }` naming that bar's placement.
 *
 * It shares the object form `{ placement }` with the heatmap's `legend` prop.
 * On the map, `'range'` or the object form selects the bar. A boolean or a
 * placement selects the switchboard.
 */
export type MapLegendInput = boolean | MapLegendPlacement | MapRangeLegendInput

/**
 * The forms that ask for the continuous scale bar rather than the binned
 * switchboard: the discriminator, and the object form that places the bar.
 *
 * Named so the two readers of the distinction cannot drift. {@link
 * isRangeLegend} narrows to it, and the region-data union subtracts it to state
 * that only the numeric branch can paint one.
 *
 * @internal
 */
export type MapRangeLegendInput = 'range' | ChartRangeLegendConfig

/**
 * Whether a `legend` prop asks for the continuous range bar rather than the
 * binned switchboard. Shared with the region-data union, which holds the bar a
 * numeric-mode form. One rule says what counts as a range request. The type
 * that refuses it and the resolver that draws it can therefore never disagree.
 *
 * A predicate rather than a boolean. The caller that has to drop a range
 * request is left holding the switchboard forms alone, rather than a cast.
 *
 * @internal
 */
export function isRangeLegend(legend: MapLegendInput | undefined): legend is MapRangeLegendInput {
	if (legend === 'range') return true

	// The only object form is the range config, so any object asks for the bar.
	return typeof legend === 'object'
}

/**
 * Whether the legend's box mounts: explicitly asked for, or able to appear. It
 * can appear with two or more categories, a registered overlay, or overlay
 * children whose entries will register from the client. Deciding off the
 * children keeps the box mounted ahead of late registrations, so they never
 * shift the frame.
 *
 * @internal
 */
function legendCanShow(
	legend: MapLegendInput | undefined,
	categoryCount: number,
	entryCount: number,
	hasOverlayChildren: boolean,
): boolean {
	if (legend !== undefined) return legend !== false

	return categoryCount > 1 || entryCount > 0 || hasOverlayChildren
}

/**
 * The switchboard legend's placement: the numeric (choropleth) mode reads on
 * the right by default. Categorical maps keep the centered bottom row, and an
 * explicit placement always wins. The range bar resolves its own placement
 * through {@link resolveRangeLegend}, so this only serves the switchboard.
 *
 * @internal
 */
function resolveLegendPlacement(
	legend: MapLegendInput | undefined,
	numeric: boolean,
): MapLegendPlacement {
	if (typeof legend === 'string' && !isRangeLegend(legend)) return legend

	return numeric ? 'right' : 'bottom'
}

/** The scale the range bar reads, kept together so {@link planMapLegend} can gate on all of it at once. @internal */
type MapRangeScale = {
	colorRange: string[] | undefined
	valueExtent: [number, number] | null
	formatValue: ((value: number) => string) | undefined
	colorName: string | undefined
	/** Each region's raw value — the bar's hover arrow marks the pointed one. */
	regionNumbers: (number | null)[]
	onFocus: (id: string | null) => void
}

/**
 * The resolved range bar: the shared scale the chart's slider takes, plus what
 * the map wires into it. Declared here rather than on the component, so the
 * engine owns the shape it builds and the view reads it. {@link MapRangeLegend}
 * takes this as its props.
 *
 * @internal
 */
export type MapLegendRange = RangeScale & {
	/** Each region's raw value (`null` = no data), feature-index aligned — the arrow marks the hovered region's. */
	regionNumbers: (number | null)[]
	/** Emphasises a bin's regions (`null` clears); other regions dim while set — the filter. */
	onFocus: (id: string | null) => void
	/**
	 * Which way the bar runs — vertical beside the plot, horizontal above or
	 * below it. Follows the resolved placement.
	 * @defaultValue 'vertical'
	 */
	orientation?: RangeOrientation
}

/** What the map draws for its legend: whether it shows, where it sits, and the range bar in range mode. @internal */
type MapLegendPlan = {
	show: boolean
	placement: MapLegendPlacement
	/** The continuous scale bar's resolved shape, or `null` for the binned switchboard. */
	range: MapLegendRange | null
}

/**
 * Resolves the map's legend against its measured box. The binned switchboard
 * keeps its own can-show and placement rules. The range bar (numeric mode,
 * `'range'` or the object form) resolves placement, orientation, and visibility
 * through the shared {@link resolveRangeLegend}. That bar sheds at the spark
 * tier. It drops a side placement to a horizontal row in a box too narrow for a
 * rail. The choropleth's bar therefore behaves exactly as the heatmap's does.
 *
 * @internal
 */
export function planMapLegend(
	legend: MapLegendInput | undefined,
	numeric: boolean,
	box: { width: number; height: number },
	switchboard: { categoryCount: number; entryCount: number; hasOverlayChildren: boolean },
	scale: MapRangeScale,
): MapLegendPlan {
	if (!(numeric && isRangeLegend(legend))) {
		return {
			show: legendCanShow(
				legend,
				switchboard.categoryCount,
				switchboard.entryCount,
				switchboard.hasOverlayChildren,
			),
			placement: resolveLegendPlacement(legend, numeric),
			range: null,
		}
	}

	const resolved = resolveRangeLegend(
		typeof legend === 'object' ? legend : undefined,
		box.width,
		box.height,
	)

	// The direct value checks (not a precomputed boolean) narrow `colorRange` and
	// `valueExtent` inside the branch, so the range props type without an assertion.
	const range: MapLegendRange | null =
		resolved.show && scale.colorRange !== undefined && scale.valueExtent !== null
			? {
					colorRange: scale.colorRange,
					domain: scale.valueExtent,
					// Through the shared resolver, not a second inline fallback: a map with
					// no `formatValue` would otherwise format its bar's endpoints by one
					// rule and its tooltip and table by another.
					format: resolveValueFormat(scale.formatValue),
					label: scale.colorName,
					bins: switchboard.categoryCount,
					regionNumbers: scale.regionNumbers,
					onFocus: scale.onFocus,
					orientation: resolved.orientation,
				}
			: null

	return { show: range !== null, placement: resolved.placement, range }
}
