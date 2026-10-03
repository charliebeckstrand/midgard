/**
 * Ugoki collapse: height reveal for `<Collapse>` panels. Two variants:
 * `fade` crossfades opacity alongside the height change. In `slide`, the
 * content moves down with the panel edge.
 *
 * Layer: kiso · Concern: collapse motion
 */

import { duration, ease } from './base'

const transition = { duration: duration[200], ease: ease.inOut }

export const collapse = {
	fade: {
		initial: { height: 0, opacity: 0 },
		animate: { height: 'auto', opacity: 1 },
		exit: { height: 0, opacity: 0 },
		transition,
	},
	slide: {
		initial: { height: 0 },
		animate: { height: 'auto' },
		exit: { height: 0 },
		transition,
		/**
		 * The motion of the content in the panel. The content moves by its full
		 * height on the same curve as the panel height. The bottom edge of the
		 * content then stays on the bottom edge of the panel.
		 */
		content: {
			initial: { y: '-100%' },
			animate: { y: 0 },
			exit: { y: '-100%' },
			transition,
		},
	},
}
