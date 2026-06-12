/**
 * Kokkaku skeleton: calendar. One block silhouette per width step; the
 * height approximates the header row above the seven square weekday/day
 * rows at that width.
 *
 * Layer: kiso · Concern: skeleton form · Unit: calendar
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const calendar = {
	base: rounded.lg,
	size: {
		sm: 'h-60 w-52',
		md: 'h-78 w-68',
		lg: 'h-92 w-80',
	},
	defaults: { size: 'md' as const },
} as const
