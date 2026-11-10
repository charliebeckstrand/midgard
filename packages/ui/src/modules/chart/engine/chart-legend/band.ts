import type { ChartLegendPlacement } from './schema'

/**
 * The container breakpoint from which a side legend sits beside the plot. A
 * chart uses `sm`, because its rail scales with the container. A map uses
 * `lg`, because its rail has a fixed width.
 *
 * @internal
 */
export type LegendBandBreakpoint = 'sm' | 'lg'

/**
 * The row classes of a side legend of the chart frame, for each side, from the
 * `@sm` width of the chart. The legend follows the plot in the DOM, so a `left`
 * legend reverses the row. The side is physical, and a right-to-left row runs
 * from the right, so the `rtl:` variant swaps the order back. Tailwind finds a
 * class only as a complete literal, so each entry is written out in full.
 *
 * The map frame does not read this. Its plot is a large SVG from the server,
 * so its side band is a grid that gives the plot its box before the browser
 * parses the legend (`k.legend.rail` of the map kata). The server draws no
 * SVG for a chart, so the legend of a chart is in the DOM before the first
 * paint of its marks.
 */
const BAND_ROW = {
	left: '@sm:flex-row-reverse rtl:@sm:flex-row',
	right: '@sm:flex-row rtl:@sm:flex-row-reverse',
} as const

/**
 * The row classes that put a side legend beside the plot of a chart from
 * `@sm`, on the physical side that `placement` names. Below the breakpoint the
 * band stays a column, with the legend under the plot. A `left` legend
 * therefore draws on the left in a right-to-left page.
 *
 * @param placement - The legend placement. A `top` or `bottom` placement has no
 * side and takes the `right` row.
 * @returns The literal row classes.
 * @internal
 */
export function legendBandRow(placement: ChartLegendPlacement): string {
	return BAND_ROW[placement === 'left' ? 'left' : 'right']
}
