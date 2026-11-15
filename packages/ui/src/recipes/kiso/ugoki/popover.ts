/**
 * Ugoki popover: the fade of a popover panel. The transition changes only the
 * opacity, and it holds the scale at 1. Floating UI sets the position.
 *
 * Layer: kiso · Concern: popover motion
 */

import { duration, ease } from './base'

export const popover = {
	initial: { opacity: 0, scale: 1 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 1 },
	transition: { duration: duration[150], ease: ease.out },
} as const
