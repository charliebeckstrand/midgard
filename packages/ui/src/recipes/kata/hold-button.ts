/**
 * HoldButton kata: the fill that grows over the button while a press holds, and
 * its motion. The button takes the button kata.
 */

import { sen, ugoki } from '../kiso'

const { duration, ease, instant } = ugoki
const { forced } = sen

export const k = {
	// The fill shows the progress of a hold with only its background. Forced
	// colors remove that background, so the fill paints the `Highlight` of a mark.
	fill: [
		'pointer-events-none absolute inset-0 origin-left rtl:origin-right bg-current/20',
		forced.mark,
	],
	// Motion transition configs, applied imperatively (`animate()` in
	// `use-hold-button-gesture.ts`), never passed to `cn`.
	motion: {
		// The fill grows at a constant rate, so its width shows the time that is
		// left. The `duration` prop of the hold sets the length.
		hold: { ease: ease.linear },
		// The snap-back of the fill after a hold completes or ends early.
		reset: { duration: duration[150], ease: ease.linear },
		// The reset under reduced motion: the fill snaps back at once.
		instant,
	},
} as const
