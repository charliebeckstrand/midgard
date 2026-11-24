/**
 * Ugoki popover: the fade of a popover panel. The transition changes only the
 * opacity, and it holds the scale at 1. Floating UI sets the position.
 *
 * The exit is a variant of the `custom` value that `AnimatePresence` gives at
 * the close. A `true` value ends the exit at once, for a panel that another
 * panel replaces (the `instant` prop of `Portal`).
 *
 * Layer: kiso · Concern: popover motion
 */

import { duration, ease, instant } from './base'

const hidden = { opacity: 0, scale: 1 } as const

export const popover = {
	initial: hidden,
	animate: { opacity: 1, scale: 1 },
	exit: 'exit',
	variants: {
		exit: (now?: boolean) => (now ? { ...hidden, transition: instant } : hidden),
	},
	transition: { duration: duration[150], ease: ease.out },
} as const
