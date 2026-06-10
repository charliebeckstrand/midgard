/**
 * Shaku mark: inline-mark dimensions for `<code>` and `<kbd>`. Sized to
 * sit within body text at three density steps.
 *
 * Layer: kiso · Concern: inline-mark dimension
 */

import { ji } from '../ji'
import { kasane } from '../kasane'

const { family, size } = ji
const { rounded } = kasane

export const mark = {
	base: [family.mono, 'bg-current/15', rounded.md],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: [size.xs, 'p-1.25'],
		lg: [size.sm, 'p-1.5'],
	},
} as const
