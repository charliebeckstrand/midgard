/**
 * Ma padding: padding utility maps keyed by the spacing label set. `p` is
 * the all-sides shorthand; `px` and `py` are the axis variants.
 *
 * Layer: kiso · Concern: padding utilities
 */

import type { Ma } from './scale'

export const p = {
	0: 'p-0',
	xs: 'p-1',
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-4',
	xl: 'p-6',
} as const satisfies Record<Ma, string>

export const px = {
	0: 'px-0',
	xs: 'px-1',
	sm: 'px-2',
	md: 'px-3',
	lg: 'px-4',
	xl: 'px-6',
} as const satisfies Record<Ma, string>

export const py = {
	0: 'py-0',
	xs: 'py-1',
	sm: 'py-2',
	md: 'py-3',
	lg: 'py-4',
	xl: 'py-6',
} as const satisfies Record<Ma, string>
