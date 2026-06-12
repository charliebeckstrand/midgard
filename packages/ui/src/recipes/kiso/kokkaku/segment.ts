/**
 * Kokkaku skeleton: segment. Rounded-box silhouette of the segment
 * control; height folds the `p-1` chrome over the item height per size
 * step. Widths are defaults; override via `className`.
 *
 * Layer: kiso · Concern: skeleton form · Unit: segment
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const segment = {
	base: rounded.lg,
	size: {
		sm: 'h-8 w-40',
		md: 'h-10 w-48',
		lg: 'h-12 w-56',
	},
	defaults: { size: 'md' as const },
} as const
