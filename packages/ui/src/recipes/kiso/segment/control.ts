/**
 * Segment archetype: outer control. The rounded-box chrome that hosts the
 * segment items and the sliding indicator. The gap between items and the text
 * follow the nearest density scope.
 *
 * Layer: kiso · Archetype: segment · Concern: control
 */

import { textRamp } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { omote } from '../omote'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote

export const control = {
	// `self-start` keeps the control hugging its content width inside the
	// `flex flex-col` tab-group, overriding `align-items: stretch` on the cross axis.
	// `max-w-full` holds it inside its container: where the labels do not fit on
	// one line, the items shrink and wrap their labels, and the page does not widen.
	base: [
		flex.inline,
		'self-start max-w-full',
		...bg.tint,
		rounded.lg,
		'p-1 density-gap-[1,2,3]',
		textRamp,
	],
} as const
