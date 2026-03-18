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
	/** Suppress browser default outline (applied before custom indicators) */
	reset: 'focus:outline-hidden',

	/** The standard focus indicator — tight ring, inset */
	ring: 'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-600',

	/** Focus indicator with breathing room — for larger targets */
	offset: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
}
