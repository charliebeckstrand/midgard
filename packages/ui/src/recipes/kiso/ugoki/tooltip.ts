/**
 * Ugoki tooltip: tooltip fade with subtle scale, tuned for rapid show/hide.
 *
 * Layer: kiso · Concern: tooltip motion
 */

import { duration, ease } from './base'

// The scale sets `transform` directly, so the browser runs it off the main
// thread. Under reduced motion, show the `still` copy of the preset. The panel
// rests at `transform: none`, as the panel in `panel.ts` does.
export const tooltip = {
	initial: { opacity: 0, transform: 'scale(0.95)' },
	animate: { opacity: 1, transform: 'scale(1)', transitionEnd: { transform: 'none' } },
	exit: { opacity: 0, transform: 'scale(0.95)' },
	transition: { duration: duration[100], ease: ease.out },
} as const
