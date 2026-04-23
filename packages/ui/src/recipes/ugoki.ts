/**
 * Ugoki (動き) — Movement.
 *
 * All motion concerns. CSS transition fragments live under `css`; Framer
 * Motion enter / exit configs spread directly onto motion elements.
 *
 * Tier: 2 · Concern: animation
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

/** Fluid spring for layoutId transitions. */
const spring = {
	type: 'spring' as const,
	stiffness: 300,
	damping: 30,
}

const tween = {
	type: 'tween' as const,
	duration: 0.15,
	ease: [0.3, 0.1, 0.3, 1] as const,
}

/** Placeholder-to-content crossfade with vertical shift and blur. */
const reveal = {
	initial: { opacity: 0, y: 4, filter: 'blur(4px)' },
	animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
	exit: { opacity: 0, y: -4, filter: 'blur(4px)' },
	transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
}

export const ugoki = {
	/**
	 * CSS transition fragments — for state changes that don't warrant Framer
	 * Motion. Was previously the standalone `nagare` recipe.
	 */
	css: {
		opacity: 'transition-opacity',
		transform: 'transition-transform',
		duration: 'duration-150',
	},

	spring,
	tween,
	reveal,
	/** Popover fade for dropdown menus. */
	popover: {
		initial: { opacity: 0, scale: 1 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 1 },
		transition: { duration: 0.15, ease: 'easeOut' as const },
	},

	/** Overlay backdrop fade for dialogs and sheets. */
	overlay: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.15 },
	},

	/** Toast slide from edge, keyed by position side. */
	toast: {
		right: {
			initial: { x: '100%', opacity: 1 },
			animate: { x: 0, opacity: 1 },
			exit: { x: '100%', opacity: 1 },
			transition: { duration: 0.15, ease: 'easeOut' as const },
		},
		left: {
			initial: { x: '-100%', opacity: 1 },
			animate: { x: 0, opacity: 1 },
			exit: { x: '-100%', opacity: 1 },
			transition: { duration: 0.15, ease: 'easeOut' as const },
		},
		bottom: {
			initial: { y: '100%', opacity: 1 },
			animate: { y: 0, opacity: 1 },
			exit: { y: '100%', opacity: 1 },
			transition: { duration: 0.15, ease: 'easeOut' as const },
		},
		top: {
			initial: { y: '-100%', opacity: 1 },
			animate: { y: 0, opacity: 1 },
			exit: { y: '-100%', opacity: 1 },
			transition: { duration: 0.15, ease: 'easeOut' as const },
		},
	},

	/** Tooltip fade with subtle scale. */
	tooltip: {
		initial: { opacity: 0, scale: 0.95 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.95 },
		transition: { duration: 0.1, ease: 'easeOut' as const },
	},

	/** Height reveal for collapse panels. */
	collapse: {
		fade: {
			initial: { height: 0, opacity: 0 },
			animate: { height: 'auto', opacity: 1 },
			exit: { height: 0, opacity: 0 },
			transition: { duration: 0.2, ease: 'easeInOut' as const },
		},
		slide: {
			initial: { height: 0 },
			animate: { height: 'auto' },
			exit: { height: 0 },
			transition: { duration: 0.2, ease: 'easeInOut' as const },
		},
	},

	/** Width reveal for inline inspector panels. */
	inspector: {
		initial: { width: 0 },
		animate: { width: 'auto' },
		exit: { width: 0 },
		transition: slideTransition,
	},

	/** Slide panel configs keyed by direction. */
	panel: {
		right: slideConfig('x', '100%'),
		left: slideConfig('x', '-100%'),
		top: slideConfig('y', '-100%'),
		bottom: slideConfig('y', '100%'),
	},
}
