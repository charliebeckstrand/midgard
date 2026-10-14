/**
 * Ugoki tooltip: tooltip fade with subtle scale, tuned for rapid show/hide.
 *
 * Layer: kiso · Concern: tooltip motion
 */

import { duration, ease } from './base'

// The scale sets `transform` directly, so the browser runs it off the main
// thread. Under reduced motion, show the `still` copy of the preset.
//
// The panel rests at `scale(1)`, not at `transform: none` (see the rule in
// `index.ts`). An exit from `none` grows the panel from `scale(0)` to 95% while
// it fades. The positioned wrapper of the tooltip has a `transform` already,
// so the rest scale adds no containing block.
export const tooltip = {
	initial: { opacity: 0, transform: 'scale(0.95)' },
	animate: { opacity: 1, transform: 'scale(1)' },
	exit: { opacity: 0, transform: 'scale(0.95)' },
	transition: { duration: duration[100], ease: ease.out },
} as const
