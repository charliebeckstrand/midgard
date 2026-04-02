/**
 * Ugoki (動き) — Movement.
 *
 * Deliberate motion — enter, exit, slide. Not passive transitions
 * (those live with their trigger), but choreographed animation.
 *
 * Every motion config is a complete spread for motion.div:
 * `<motion.div {...ugoki.popover}>` — no inline overrides needed.
 *
 * Branch of: Ugoki (root)
 * Concern: animation
 */

const slideTransition = { duration: 0.15 } as const

function slideConfig(axis: 'x' | 'y', value: string) {
	return {
		initial: { [axis]: value, opacity: 1 },
		animate: { x: 0, y: 0, opacity: 1 },
		exit: { [axis]: value, opacity: 1 },
		transition: slideTransition,
	}
}

/** Tap feedback — snappy spring for press interactions */
const tap = {
	type: 'spring' as const,
	stiffness: 500,
	damping: 15,
}

/** Layout morph — fluid spring for layoutId transitions */
const layout = {
	type: 'spring' as const,
	stiffness: 300,
	damping: 30,
}

/** Reveal — placeholder-to-content crossfade with subtle vertical shift + blur */
const reveal = {
	initial: { opacity: 0, y: 4, filter: 'blur(4px)' },
	animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
	exit: { opacity: 0, y: -4, filter: 'blur(4px)' },
	transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
}

export const ugoki = {
	tap,
	layout,
	reveal,
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
