/**
 * Kokkaku skeleton: badge. Pill silhouette across the four badge size
 * steps.
 *
 * Layer: kiso · Concern: skeleton form · Unit: badge
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const badge = {
	base: rounded.md,
	size: {
		xs: 'h-4 w-10',
		sm: 'h-5 w-12',
		md: 'h-6 w-14',
		lg: 'h-7 w-16',
	},
	defaults: { size: 'md' as const },
} as const
