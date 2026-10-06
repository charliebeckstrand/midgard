/**
 * HoldButton kata: the motion of the fill that grows over the button while a
 * press holds. The button takes the button kata, and the fill keeps its classes
 * inline.
 */

import { ugoki } from '../kiso'

const { duration, ease } = ugoki

export const k = {
	// Motion transition configs, applied imperatively (`animate()` in
	// `use-hold-button-gesture.ts`), never passed to `cn`.
	motion: {
		// The fill grows at a constant rate, so its width shows the time that is
		// left. The `duration` prop of the hold sets the length.
		hold: { ease: ease.linear },
		// The snap-back of the fill after a hold completes or ends early.
		reset: { duration: duration[150], ease: ease.linear },
	},
} as const
