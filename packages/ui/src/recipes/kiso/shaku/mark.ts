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
		sm: [size.xs, 'px-1 py-0.5'],
		md: [size.sm, 'px-1.5 py-1'],
		lg: [size.md, 'px-2 py-1.5'],
	},
} as const
