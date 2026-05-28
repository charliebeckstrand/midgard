/**
 * Ma padding — full padding utility maps keyed by the spacing label
 * set. `p` is the all-sides shorthand; `px` / `py` / `pl` / `pr` / `pt`
 * / `pb` are the directional variants.
 *
 * Layer: kiso · Concern: padding utilities
 */

import type { Ma } from './stops'

export const p = {
	xs: 'p-1',
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-4',
	xl: 'p-6',
} as const satisfies Record<Ma, string>

export const px = {
	xs: 'px-1',
	sm: 'px-2',
	md: 'px-3',
	lg: 'px-4',
	xl: 'px-6',
} as const satisfies Record<Ma, string>

export const py = {
	xs: 'py-1',
	sm: 'py-2',
	md: 'py-3',
	lg: 'py-4',
	xl: 'py-6',
} as const satisfies Record<Ma, string>

export const pl = {
	xs: 'pl-1',
	sm: 'pl-2',
	md: 'pl-3',
	lg: 'pl-4',
	xl: 'pl-6',
} as const satisfies Record<Ma, string>

export const pr = {
	xs: 'pr-1',
	sm: 'pr-2',
	md: 'pr-3',
	lg: 'pr-4',
	xl: 'pr-6',
} as const satisfies Record<Ma, string>

export const pt = {
	xs: 'pt-1',
	sm: 'pt-2',
	md: 'pt-3',
	lg: 'pt-4',
	xl: 'pt-6',
} as const satisfies Record<Ma, string>

export const pb = {
	xs: 'pb-1',
	sm: 'pb-2',
	md: 'pb-3',
	lg: 'pb-4',
	xl: 'pb-6',
} as const satisfies Record<Ma, string>
