/**
 * Ugoki (動き) — Movement.
 *
 * Deliberate motion — enter, exit, slide. Not passive transitions
 * (those live with their trigger), but choreographed animation.
 *
 * Every motion config is a complete spread for motion.div:
 * `<motion.div {...ugoki.popover}>` — no inline overrides needed.
 */

const slideTransition = { duration: 0.3, ease: [0.32, 0.72, 0, 1] } as const

function slideConfig(axis: 'x' | 'y', value: string) {
	return {
		initial: { [axis]: value, opacity: 0 },
		animate: { x: 0, y: 0, opacity: 1 },
		exit: { [axis]: value, opacity: 0 },
		transition: slideTransition,
	}
}

export const ugoki = {
	/** Popover enter/exit — scale + fade for dropdown menus */
	popover: {
		initial: { opacity: 0, scale: 0.95 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.95 },
		transition: { duration: 0.1, ease: 'easeOut' as const },
	},

	/** Backdrop fade — overlay for dialogs and sheets */
	overlay: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.15 },
	},

	/** Slide panel — complete motion configs per direction */
	panel: {
		right: slideConfig('x', '100%'),
		left: slideConfig('x', '-100%'),
		top: slideConfig('y', '-100%'),
		bottom: slideConfig('y', '100%'),
	},
}
