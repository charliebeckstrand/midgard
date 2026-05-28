/**
 * Narabi flex — the small flex primitives shared across kata. Each is a
 * single utility (or pair) that recurred enough to earn a name; consumers
 * spread them inline rather than re-typing the literal.
 *
 * Layer: kiso · Concern: flex primitives
 */

/** Horizontal flex row with vertical centering. */
export const row = 'flex items-center'

/** Inline flex row with vertical centering. */
export const inlineRow = 'inline-flex items-center'

/** Vertical flex column. */
export const col = 'flex flex-col'

/** Fill remaining flex track. */
export const fill = 'flex-1'
