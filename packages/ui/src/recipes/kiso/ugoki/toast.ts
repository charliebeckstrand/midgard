/**
 * Ugoki toast: toast slide-in from the top or bottom edge, and the dismissal
 * transition on the same tempo.
 *
 * Layer: kiso · Concern: toast motion
 */

import { duration, ease } from './base'

/** One tempo for the whole gesture: slide-in and dismissal move as one. */
const tempo = duration[150]

// The slide sets `transform` directly, so the browser runs it off the main
// thread. Under reduced motion, show the `still` copy of a preset. The toast
// rests at `transform: none`, as the panel in `panel.ts` does.
function slide(value: string) {
	return {
		initial: { transform: `translateY(${value})`, opacity: 1 },
		animate: { transform: 'translateY(0%)', opacity: 1, transitionEnd: { transform: 'none' } },
		exit: { transform: `translateY(${value})`, opacity: 1 },
		transition: { duration: tempo, ease: ease.out },
	}
}

export const toast = {
	top: slide('-100%'),
	bottom: slide('100%'),
	/** Dismissal fade / collapse transition. */
	dismiss: { duration: tempo },
} as const
