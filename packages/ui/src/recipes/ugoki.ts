/**
 * Ugoki (動き) — Movement.
 *
 * Deliberate motion — enter, exit, slide. Not passive transitions
 * (those live with their trigger), but choreographed animation.
 *
 * Branch of: Ki (root)
 * Concern: animation
 */
export const ugoki = {
	/** Popover enter/exit for dropdown menus */
	popover: {
		initial: { opacity: 0, scale: 0.95 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.95 },
		transition: { duration: 0.1, ease: 'easeOut' as const },
	},

	/** Backdrop fade for dialogs and alerts */
	overlay: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.15 },
	},

	/** Panel slide-in from left (mobile sidebar) */
	slide: {
		initial: { x: '-100%' },
		animate: { x: 0 },
		exit: { x: '-100%' },
		transition: { duration: 0.3, ease: 'easeInOut' as const },
	},
}
