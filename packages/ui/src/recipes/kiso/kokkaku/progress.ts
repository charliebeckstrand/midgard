/**
 * Kokkaku skeleton: progress. The bar fills its parent at the track
 * height per size step; the gauge is a circle on its diameter scale.
 *
 * The `size` maps give the track and the diameter of the real bar and gauge.
 * The `base` of each silhouette repeats its map in a stepped `density-*`
 * class, so the silhouette takes the step of its nearest density scope.
 * `skeleton-ramp.test.ts` pins each stepped class to its map.
 *
 * Layer: kiso · Concern: skeleton form · Unit: progress
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const progress = {
	bar: {
		base: ['w-full', rounded.full, 'density-h-[2,3,4]'],
		size: {
			sm: 'h-2',
			md: 'h-3',
			lg: 'h-4',
		},
		density: ['sm', 'md', 'lg'],
	},
	gauge: {
		base: [rounded.full, 'density-size-[12,16,20]'],
		size: {
			sm: 'size-12',
			md: 'size-16',
			lg: 'size-20',
		},
		density: ['sm', 'md', 'lg'],
	},
} as const
