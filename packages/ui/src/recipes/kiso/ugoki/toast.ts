/**
 * Ugoki toast: toast slide-in from the top or bottom edge, and the dismissal
 * transition on the same tempo. The slide is the slide of a panel at the same
 * edge (`panel.ts`), so the toast also rests at `transform: none`. Under
 * reduced motion, show the `still` copy of a preset.
 *
 * Layer: kiso · Concern: toast motion
 */

import { panel } from './panel'

export const toast = {
	top: panel.top,
	bottom: panel.bottom,
	/** The dismissal fade and collapse, on the tempo of the slide. */
	dismiss: { duration: panel.top.transition.duration },
} as const
