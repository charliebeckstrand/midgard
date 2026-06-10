/**
 * Ugoki overlay: backdrop fade for dialogs and sheets. Opacity only.
 *
 * Layer: kiso · Concern: backdrop motion
 */

export const overlay = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.15 },
}
