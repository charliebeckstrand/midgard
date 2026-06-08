/**
 * Ugoki popover — popover panel fade. Opacity-only transition; scale and
 * position are held at identity (floating-ui manages anchor alignment).
 *
 * Layer: kiso · Concern: popover motion
 */

export const popover = {
	initial: { opacity: 0, scale: 1 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 1 },
	transition: { duration: 0.15, ease: 'easeOut' as const },
}
