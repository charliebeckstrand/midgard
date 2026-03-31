/**
 * Ki (気) — Energy.
 *
 * The spirit that makes an element alive — how it signals focus,
 * how it tells the user "I'm listening."
 *
 * Branch of: Ki (root)
 * Concern: interaction
 */
export const ki = {
	/** No-op — focus suppression handled by global CSS :focus:not(:focus-visible) reset */
	reset: '',

	/** The standard focus indicator — slight offset ring */
	ring: 'outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600',

	/** Focus indicator with breathing room — for larger targets */
	offset:
		'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
}
