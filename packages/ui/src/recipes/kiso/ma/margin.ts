/**
 * Ma margin: margin utility maps keyed by the spacing label set. `m` is
 * the all-sides shorthand; `mx` and `my` are the axis variants.
 *
 * Layer: kiso · Concern: margin utilities
 */

import type { Ma } from './scale'

export const m = {
	xs: 'm-1',
	sm: 'm-2',
	md: 'm-3',
	lg: 'm-4',
	xl: 'm-6',
} as const satisfies Record<Ma, string>

export const mx = {
	xs: 'mx-1',
	sm: 'mx-2',
	md: 'mx-3',
	lg: 'mx-4',
	xl: 'mx-6',
} as const satisfies Record<Ma, string>

export const my = {
	xs: 'my-1',
	sm: 'my-2',
	md: 'my-3',
	lg: 'my-4',
	xl: 'my-6',
} as const satisfies Record<Ma, string>
