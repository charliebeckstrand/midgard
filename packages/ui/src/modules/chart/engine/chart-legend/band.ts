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
 * The row classes of a side legend, for each breakpoint and side. The legend
 * follows the plot in the DOM, so a `left` legend reverses the row. The side is
 * physical, and a right-to-left row runs from the right, so the `rtl:` variant
 * swaps the order back. Tailwind finds a class only as a complete literal, so
 * each entry is written out in full.
 */
const BAND_ROW = {
	sm: {
		left: '@sm:flex-row-reverse rtl:@sm:flex-row',
		right: '@sm:flex-row rtl:@sm:flex-row-reverse',
	},
	lg: {
		left: '@lg:flex-row-reverse rtl:@lg:flex-row',
		right: '@lg:flex-row rtl:@lg:flex-row-reverse',
	},
} as const

/**
 * The row classes that put a side legend beside the plot from `breakpoint`, on
 * the physical side that `placement` names. Below the breakpoint the band stays
 * a column, with the legend under the plot. The chart frame and the map frame
 * both read this, so a `left` legend draws on the left in a right-to-left page.
 *
 * @param placement - The legend placement. A `top` or `bottom` placement has no
 * side and takes the `right` row.
 * @param breakpoint - The container breakpoint from which the band is a row.
 * @returns The literal row classes.
 * @internal
 */
export function legendBandRow(
	placement: ChartLegendPlacement,
	breakpoint: LegendBandBreakpoint,
): string {
	return BAND_ROW[breakpoint][placement === 'left' ? 'left' : 'right']
}
