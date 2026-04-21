/**
 * Yasumi (休み) — Rest.
 *
 * Dormant, non-interactive state.
 *
 * Tier: 1 · Concern: disabled
 */

import { nagare } from './nagare'

export const yasumi = {
	disabled: [
		nagare.opacity,
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'data-disabled:opacity-50 data-disabled:cursor-not-allowed',
		'group-disabled:opacity-50',
	],
} as const
