/**
 * Kokkaku skeleton: calendar. One block silhouette per width step; the
 * 7/8 aspect ratio approximates the header row above the six square
 * week rows.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const calendar = {
	base: [rounded.lg, 'aspect-[7/8]'],
	size: {
		sm: 'w-52',
		md: 'w-68',
		lg: 'w-80',
	},
	defaults: { size: 'md' as const },
} as const
