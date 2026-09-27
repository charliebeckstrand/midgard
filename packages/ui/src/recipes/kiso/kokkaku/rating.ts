/**
 * Kokkaku skeleton: rating. One star-shaped square; the component repeats it
 * per star, because the silhouette's width is the star count and not a size
 * step.
 *
 * `size` gives the glyph of the real star. `star` repeats it in a stepped
 * `density-size` class, and `gap` repeats the gap of the rating row. So the
 * silhouette takes the step of its nearest density scope.
 * `skeleton-ramp.test.ts` pins each stepped class to its map.
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
	star: 'density-size-[4,5,6]',
	gap: 'density-gap-[0.5,0.5,1]',
} as const
