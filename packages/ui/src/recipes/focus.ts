/**
 * Focus recipes — the interaction patterns for keyboard/pointer focus.
 *
 * Single concern: interaction. These encode how focus indicators appear.
 */

/** Focus reset: hide default browser outline (applied before custom indicators) */
export const focusReset = 'focus:outline-hidden'

/** Focus ring: the standard visible focus indicator */
export const focusRing =
	'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-600'

/** Focus ring (offset): focus indicator with positive offset for larger targets */
export const focusRingOffset =
	'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
