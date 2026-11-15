/**
 * Narabi flex: the flex pairs shared across kata. `row`, `col`, and `inline`
 * each name a pair of utilities that recurs, so a consumer reads the pair and
 * does not type it again. A single utility, such as `flex-1`, names no pattern
 * and stays a plain class. The `align` table is an axis of the structure units
 * (Flex, Split, and Columns), not a fragment to spread.
 *
 * Layer: kiso · Concern: flex primitives
 */

export const flex = {
	/** Horizontal flex row with vertical centering. */
	row: 'flex items-center',
	/** Vertical flex column. */
	col: 'flex flex-col',
	/** Inline flex row with vertical centering. */
	inline: 'inline-flex items-center',
	/** The `align-items` of each alignment of the children of a flex box or a grid. */
	align: {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		stretch: 'items-stretch',
		baseline: 'items-baseline',
	},
} as const
