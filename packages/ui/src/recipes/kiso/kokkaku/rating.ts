/**
 * Kokkaku skeleton: rating. One star-shaped square; the component repeats it
 * per star, because the silhouette's width is the star count and not a size
 * step.
 *
 * Layer: kiso · Concern: skeleton form · Unit: rating
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const rating = {
	base: [rounded.sm],
	size: {
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
	},
	defaults: { size: 'md' as const },
} as const
