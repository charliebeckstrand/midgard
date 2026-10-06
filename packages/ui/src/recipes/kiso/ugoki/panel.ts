/**
 * Ugoki panel: slide-from-edge panel configs keyed by direction. Used
 * by sheet and drawer to animate the panel into view from its anchored
 * edge.
 *
 * The slide sets `transform` directly, so the browser runs it off the main
 * thread. The panel thus keeps its slide while the main thread mounts the
 * content. Under reduced motion, show the `still` copy of a preset.
 *
 * The panel rests at `transform: none`. Any other transform makes the panel a
 * containing block for fixed descendants and a stacking context. Motion writes
 * `none` as a zero translate, so `transitionEnd` sets it on arrival.
 *
 * Layer: kiso · Concern: panel motion
 */

import { duration } from './base'

function slide(axis: 'x' | 'y', value: string) {
	const translate = axis === 'x' ? 'translateX' : 'translateY'

	return {
		initial: { transform: `${translate}(${value})`, opacity: 1 },
		animate: { transform: `${translate}(0%)`, opacity: 1, transitionEnd: { transform: 'none' } },
		exit: { transform: `${translate}(${value})`, opacity: 1 },
		transition: { duration: duration[150] },
	}
}

export const panel = {
	right: slide('x', '100%'),
	left: slide('x', '-100%'),
	top: slide('y', '-100%'),
	bottom: slide('y', '100%'),
} as const
