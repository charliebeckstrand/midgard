/**
 * Shaku mark — inline-mark dimensions for `<code>` and `<kbd>`. Sized to
 * sit naturally within body text at three density steps.
 *
 * Layer: kiso · Concern: inline-mark dimension
 */

import { ji } from '../ji'
import { kasane } from '../kasane'

export const mark = {
	base: [ji.family.mono, 'bg-current/15', kasane.rounded.md],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: [ji.size.xs, 'p-1.25'],
		lg: [ji.size.sm, 'p-1.5'],
	},
} as const
