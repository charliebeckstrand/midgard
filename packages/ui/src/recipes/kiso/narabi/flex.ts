/**
 * Narabi flex: the small flex primitives shared across kata. Each is a
 * single utility (or pair) that recurred enough to earn a name; consumers
 * spread them inline rather than re-typing the literal. The `direction`,
 * `align`, and `justify` tables are the axes of the structure units.
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
	/** Fill remaining flex track. */
	fill: 'flex-1',
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
