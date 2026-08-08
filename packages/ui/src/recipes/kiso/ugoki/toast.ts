/**
 * Ugoki toast: toast slide-in from the top or bottom edge, and the dismissal
 * transition on the same tempo.
 *
 * Layer: kiso · Concern: toast motion
 */

import { duration, ease } from './base'

/** One tempo for the whole gesture: slide-in and dismissal move as one. */
const tempo = duration[150]

function slide(value: string) {
	return {
		initial: { y: value, opacity: 1 },
		animate: { y: 0, opacity: 1 },
		exit: { y: value, opacity: 1 },
		transition: { duration: tempo, ease: ease.out },
	}
}

export const toast = {
	top: slide('-100%'),
	bottom: slide('100%'),
	/** Dismissal fade / collapse transition. */
	dismiss: { duration: tempo },
}
