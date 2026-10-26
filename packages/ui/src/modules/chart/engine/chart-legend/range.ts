/**
 * Placement and orientation resolution for a color-scaled chart's range
 * legend, kept React-free beside `chart-tier.ts` so the breakpoint math is
 * unit-testable in isolation. The heatmap keys its continuous scale bar off its
 * `legend` prop. The choropleth keys it off `'range'` or the object form. The
 * bar sheds at the spark tier. A `'left'` / `'right'` placement stands the bar
 * vertical beside the plot from the frame's container breakpoint, and the frame
 * stacks it as a horizontal row under the plot below that breakpoint. CSS draws
 * that change, so the placement does not depend on a measurement. A `'top'` /
 * `'bottom'` placement lays the bar flat.
 */

import type { ChartOrientation } from '../chart-orientation'
import { COMPACT_WIDTH, isSparkBox } from '../chart-tier'
import type { LegendBandBreakpoint } from './band'
import { type ChartLegendPlacement, legendAside } from './schema'

/**
 * The container width in px, at the default root font size, of each legend
 * band breakpoint: `@sm` (24rem) and `@lg` (32rem). The measured reading of
 * the CSS breakpoint, for what CSS cannot draw: the shared width of the plot
 * and the `aria-orientation` of the bar.
 */
const BAND_WIDTH: Record<LegendBandBreakpoint, number> = { sm: COMPACT_WIDTH, lg: 512 }

/**
 * The object form of a color-scaled chart's `legend` prop: the scale bar's
 * `placement`, which drives its orientation. A `'left'` / `'right'` placement
 * stands the bar vertical beside the plot, and a `'top'` / `'bottom'` one lays
 * it horizontal above or below. On the heatmap, the prop also takes a bare
 * boolean (show at the default placement, or drop it), or a bare placement
 * string. On the choropleth, the object form is the only way to place the bar.
 */
export type ChartRangeLegendConfig = {
	/**
	 * Where the bar sits around the plot; drives its orientation. A side
	 * placement stands it vertical, a stacked one lays it horizontal.
	 * @defaultValue 'right'
	 */
	placement?: ChartLegendPlacement
}

/** A `legend` prop resolved against the measured box to concrete placement, orientation, and visibility. @internal */
export type ResolvedRangeLegend = {
	/** Whether the scale bar mounts at all: off at the spark tier, or when `legend` is `false`. */
	show: boolean
	/** Where the bar sits. A side placement stays a side placement at every width: the frame's CSS stacks it. */
	placement: ChartLegendPlacement
	/**
	 * The breakpoint from which a side bar stands beside the plot, for the
	 * range legend's `aside`, or `undefined` for a top or bottom bar.
	 */
	aside: LegendBandBreakpoint | undefined
	/**
	 * The bar's measured axis, for `aria-orientation`: vertical while a side bar
	 * sits beside the plot, horizontal when it lies stacked or flat.
	 */
	orientation: ChartOrientation
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
 * Whether a color-scaled chart's range legend sits beside the plot at a
 * measured `width`: a side placement in a box that reaches the frame's
 * breakpoint. Below it, the frame's CSS stacks the bar under the plot. The
 * answer reads the width alone, so a chart can resolve it before it sizes the
 * plot. CSS draws the layout itself. This reading serves what CSS cannot
 * draw: the share of a fixed width that the plot takes, and the
 * `aria-orientation` of the bar.
 *
 * @param legend - The caller's `legend` prop.
 * @param width - The box width, as for {@link resolveRangeLegend}. An
 * unmeasured box (width 0) keeps a side placement beside the plot.
 * @param defaultPlacement - Where the bar sits when the prop names none.
 * @param breakpoint - The frame's container breakpoint for a side legend.
 * @internal
 */
export function rangeLegendBeside(
	legend: boolean | ChartLegendPlacement | ChartRangeLegendConfig | undefined,
	width: number,
	defaultPlacement: ChartLegendPlacement = 'right',
	breakpoint: LegendBandBreakpoint = 'sm',
): boolean {
	const requested = requestedPlacement(legend, defaultPlacement)

	return legendAside(requested) && !(width > 0 && width < BAND_WIDTH[breakpoint])
}

/**
 * Resolves a color-scaled chart's `legend` prop against its measured box to the
 * range legend's placement, orientation, and whether it shows. The prop names a
 * placement: a bare boolean at the default, a bare string, or `{ placement }`.
 * The bar sheds at the spark tier, its chrome stripped to bare marks. A
 * left/right placement is a side bar: the frame's CSS stands it vertical beside
 * the plot from `breakpoint` and stacks it as a horizontal row under the plot
 * below it, the way a side categorical legend stacks. A top/bottom placement
 * lays it horizontal. The placement does not read the width, so the server
 * and the first paint already draw the final layout.
 *
 * @param legend - The caller's `legend` prop.
 * @param width - The box width the spark tier and the measured orientation
 * read. Pass the chart's own container, not the plot. Moving the bar off the
 * side then never feeds the plot's own width back.
 * @param height - The box height, for the spark-floor check.
 * @param defaultPlacement - Where the bar sits when the prop names none.
 * @param breakpoint - The frame's container breakpoint for a side legend.
 * @internal
 */
export function resolveRangeLegend(
	legend: boolean | ChartLegendPlacement | ChartRangeLegendConfig | undefined,
	width: number,
	height: number,
	defaultPlacement: ChartLegendPlacement = 'right',
	breakpoint: LegendBandBreakpoint = 'sm',
): ResolvedRangeLegend {
	const placement = requestedPlacement(legend, defaultPlacement)

	// Off, or stripped with the rest of the chrome at the spark floor: the way a
	// cartesian frame drops its legend to draw a bare sparkline. An unmeasured box
	// (width 0) keeps the bar, as {@link rangeLegendBeside} keeps a side bar: shedding on
	// "unmeasured" would mount the bar only after the measurement lands (a
	// transition later than the plot's own pre-paint measure), so the plot would
	// paint at full width first and visibly shrink when the rail arrived. Reserving
	// ahead means the plot's first measurement already excludes the rail, and a box
	// that then proves spark-small sheds it on the next commit instead.
	const show = legend !== false && (width === 0 || !isSparkBox(width, height))

	const beside = rangeLegendBeside(legend, width, defaultPlacement, breakpoint)

	return {
		show,
		placement,
		aside: legendAside(placement) ? breakpoint : undefined,
		orientation: beside ? 'vertical' : 'horizontal',
	}
}
