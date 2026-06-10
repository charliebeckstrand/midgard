/**
 * Narabi flex: the small flex primitives shared across kata. Each is a
 * single utility (or pair) that recurred enough to earn a name; consumers
 * spread them inline rather than re-typing the literal.
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
} as const
