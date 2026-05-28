/**
 * Ma margin — full margin utility maps keyed by the spacing label set.
 * `m` is the all-sides shorthand; `mx` / `my` / `ml` / `mr` / `mt` /
 * `mb` are the directional variants.
 *
 * Layer: kiso · Concern: margin utilities
 */

import type { Ma } from './stops'

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

export const ml = {
	xs: 'ml-1',
	sm: 'ml-2',
	md: 'ml-3',
	lg: 'ml-4',
	xl: 'ml-6',
} as const satisfies Record<Ma, string>

export const mr = {
	xs: 'mr-1',
	sm: 'mr-2',
	md: 'mr-3',
	lg: 'mr-4',
	xl: 'mr-6',
} as const satisfies Record<Ma, string>

export const mt = {
	xs: 'mt-1',
	sm: 'mt-2',
	md: 'mt-3',
	lg: 'mt-4',
	xl: 'mt-6',
} as const satisfies Record<Ma, string>

export const mb = {
	xs: 'mb-1',
	sm: 'mb-2',
	md: 'mb-3',
	lg: 'mb-4',
	xl: 'mb-6',
} as const satisfies Record<Ma, string>
