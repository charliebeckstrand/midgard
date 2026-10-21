/**
 * Ugoki toast: toast slide-in from the top or bottom edge, and the dismissal
 * transition on the same tempo. The slide is the slide of a panel at the same
 * edge (`panel.ts`), so the toast also rests at `transform: none`. Only the
 * easing is the toast's own. Under reduced motion, show the `still` copy of a
 * preset.
 *
 * Layer: kiso · Concern: toast motion
 */

import { duration, ease } from './base'
import { panel } from './panel'

/** One tempo for the whole gesture: slide-in and dismissal move as one. */
const tempo = duration[150]

const transition = { duration: tempo, ease: ease.out }

export const toast = {
	top: { ...panel.top, transition },
	bottom: { ...panel.bottom, transition },
	/** Dismissal fade / collapse transition. */
	dismiss: { duration: tempo },
} as const
