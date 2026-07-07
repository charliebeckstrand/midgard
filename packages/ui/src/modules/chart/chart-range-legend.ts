/**
 * Placement and orientation resolution for a colour-scaled chart's range
 * legend, kept React-free beside `chart-tier.ts` so the breakpoint math is
 * unit-testable in isolation. A colour-scaled chart (heatmap, choropleth) keys
 * its continuous scale bar off the same `legend` prop a categorical chart does,
 * then lets the measured box adjust it the way the categorical legend adjusts:
 * the bar sheds at the spark tier, and a box too narrow for a side rail drops a
 * side placement to a horizontal row under the plot. A `'left'` / `'right'`
 * placement stands the bar vertical, a `'top'` / `'bottom'` one lays it flat.
 */

import type { ChartOrientation } from './chart-orientation'
import type { ChartLegendPlacement, ChartRangeLegendConfig } from './chart-schema'
import { COMPACT_WIDTH, isSparkBox } from './chart-tier'

/** A `legend` prop resolved against the measured box to concrete placement, orientation, and visibility. @internal */
export type ResolvedRangeLegend = {
	/** Whether the scale bar mounts at all — off at the spark tier, or when `legend` is `false`. */
	show: boolean
	/** Where the bar sits, after the box adjusts a side placement in a too-narrow frame. */
	placement: ChartLegendPlacement
	/** The bar's axis: a side placement stands it vertical, a stacked one lays it horizontal. */
	orientation: ChartOrientation
}

/**
 * A left/right placement stands the scale bar vertical beside the plot; a
 * top/bottom one lays it horizontal above or below.
 *
 * @internal
 */
export function rangeLegendOrientation(placement: ChartLegendPlacement): ChartOrientation {
	return placement === 'left' || placement === 'right' ? 'vertical' : 'horizontal'
}

/** The placement a `legend` prop names, before the box adjusts it. @internal */
function requestedPlacement(
	legend: boolean | ChartLegendPlacement | ChartRangeLegendConfig | undefined,
	defaultPlacement: ChartLegendPlacement,
): ChartLegendPlacement {
	if (typeof legend === 'string') return legend

	if (legend !== null && typeof legend === 'object') return legend.placement ?? defaultPlacement

	return defaultPlacement
}

/**
 * Resolves a colour-scaled chart's `legend` prop against its measured box to the
 * range legend's placement, orientation, and whether it shows. The prop names a
 * placement — a bare boolean at the default, a bare string, or `{ placement }` —
 * and the box then adjusts it the way a categorical legend adjusts: the bar
 * sheds at the spark tier (its chrome stripped to bare marks), and a box too
 * narrow for a side rail (`compact` width) drops a side placement to a
 * horizontal row under the plot. A left/right placement stands the bar vertical,
 * a top/bottom one lays it horizontal.
 *
 * @param legend The caller's `legend` prop.
 * @param width The box width the placement decides against — pass the chart's
 * own container, not the plot, so moving the bar off the side never feeds the
 * plot's own width back and oscillates the placement.
 * @param height The box height, for the spark-floor check.
 * @param defaultPlacement Where the bar sits when the prop names none.
 * @internal
 */
export function resolveRangeLegend(
	legend: boolean | ChartLegendPlacement | ChartRangeLegendConfig | undefined,
	width: number,
	height: number,
	defaultPlacement: ChartLegendPlacement = 'right',
): ResolvedRangeLegend {
	const requested = requestedPlacement(legend, defaultPlacement)

	// Off, or stripped with the rest of the chrome at the spark floor — the way a
	// cartesian frame drops its legend to draw a bare sparkline.
	if (legend === false || isSparkBox(width, height)) {
		return { show: false, placement: requested, orientation: rangeLegendOrientation(requested) }
	}

	// A box too narrow for a side rail drops a side placement to a horizontal row
	// under the plot, the way a side categorical legend stacks below its engage
	// width. A stacked placement is already horizontal and stays put.
	const side = requested === 'left' || requested === 'right'

	const placement: ChartLegendPlacement = side && width < COMPACT_WIDTH ? 'bottom' : requested

	return { show: true, placement, orientation: rangeLegendOrientation(placement) }
}
