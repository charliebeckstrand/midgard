/**
 * Ugoki popover — popover panel fade. Opacity-only transition; the
 * panel doesn't scale or shift because the positioning library
 * (floating-ui) handles anchor alignment frame-by-frame.
 *
 * Layer: kiso · Concern: popover motion
 */

export const popover = {
	initial: { opacity: 0, scale: 1 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 1 },
	transition: { duration: 0.15, ease: 'easeOut' as const },
}
