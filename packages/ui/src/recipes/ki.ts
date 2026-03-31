/**
 * Ki (気) — Energy.
 *
 * The spirit that makes an element alive — how it signals focus,
 * how it tells the user "I'm listening."
 *
 * Focus suppression (:focus without :focus-visible) is handled by global CSS.
 *
 * Branch of: Ki (root)
 * Concern: interaction
 */
export const ki = {
	/** The standard focus indicator — slight offset ring */
	ring: 'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',

	/** Focus indicator with breathing room — for larger targets */
	offset: 'outline-none focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
}
