/**
 * Kokkaku skeleton — card. Block silhouette across three card size
 * steps; rounding tracks size.
 *
 * Layer: kiso · Concern: skeleton form · Unit: card
 */

import { kasane } from '../kasane'

export const card = {
	base: 'w-full',
	size: {
		sm: ['h-24', kasane.rounded.sm],
		md: ['h-32', kasane.rounded.md],
		lg: ['h-40', kasane.rounded.lg],
	},
	defaults: { size: 'md' as const },
} as const
