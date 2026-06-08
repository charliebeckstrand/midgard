/**
 * Ugoki tooltip — tooltip fade with subtle scale, tuned for rapid show/hide.
 *
 * Layer: kiso · Concern: tooltip motion
 */

export const tooltip = {
	initial: { opacity: 0, scale: 0.95 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.95 },
	transition: { duration: 0.1, ease: 'easeOut' as const },
}
