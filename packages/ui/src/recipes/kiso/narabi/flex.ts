/**
 * Narabi flex: the flex pairs shared across kata. `row`, `col`, and `inline`
 * each name a pair of utilities that recurs, so a consumer reads the pair and
 * does not type it again. A single utility, such as `flex-1`, names no pattern
 * and stays a plain class. The `direction`, `align`, and `justify` tables are
 * the axes of the structure units, not fragments to spread.
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
	/** The `flex-direction` of each direction of a flex box. */
	direction: {
		row: 'flex-row',
		col: 'flex-col',
		'row-reverse': 'flex-row-reverse',
		'col-reverse': 'flex-col-reverse',
	},
	/** The `align-items` of each alignment of the children of a flex box or a grid. */
	align: {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		stretch: 'items-stretch',
		baseline: 'items-baseline',
	},
	/** The `justify-content` of each distribution of the children of a flex box. */
	justify: {
		start: 'justify-start',
		center: 'justify-center',
		end: 'justify-end',
		between: 'justify-between',
		around: 'justify-around',
		evenly: 'justify-evenly',
	},
} as const
