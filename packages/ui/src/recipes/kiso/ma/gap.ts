/**
 * Ma gap — full gap utility maps keyed by the spacing label set.
 * `gap` is the bidirectional gap; `gapX` / `gapY` are the directional
 * variants.
 *
 * Layer: kiso · Concern: gap utilities
 */

import type { Ma } from './stops'

export const gap = {
	xs: 'gap-1',
	sm: 'gap-2',
	md: 'gap-3',
	lg: 'gap-4',
	xl: 'gap-6',
} as const satisfies Record<Ma, string>

export const gapX = {
	xs: 'gap-x-1',
	sm: 'gap-x-2',
	md: 'gap-x-3',
	lg: 'gap-x-4',
	xl: 'gap-x-6',
} as const satisfies Record<Ma, string>

export const gapY = {
	xs: 'gap-y-1',
	sm: 'gap-y-2',
	md: 'gap-y-3',
	lg: 'gap-y-4',
	xl: 'gap-y-6',
} as const satisfies Record<Ma, string>
