/**
 * Kokkaku skeleton: progress. The bar fills its parent at the track
 * height per size step; the gauge is a circle on the gauge diameter
 * scale.
 *
 * Layer: kiso · Concern: skeleton form · Unit: progress
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const progress = {
	bar: {
		base: ['w-full', rounded.full],
		size: {
			sm: 'h-2',
			md: 'h-3',
			lg: 'h-4',
		},
		defaults: { size: 'md' as const },
	},
	gauge: {
		base: rounded.full,
		size: {
			sm: 'size-12',
			md: 'size-16',
			lg: 'size-20',
			xl: 'size-24',
		},
		defaults: { size: 'md' as const },
	},
} as const
