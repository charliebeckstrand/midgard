/**
 * Kokkaku skeleton: sparkline. A plain rounded block on the chart's
 * width × height silhouette per size step, standing in for the drawn series.
 *
 * Layer: kiso · Concern: skeleton form · Unit: sparkline
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const sparkline = {
	base: ['inline-block', rounded.sm],
	size: {
		sm: ['w-16', 'h-6'],
		md: ['w-24', 'h-8'],
		lg: ['w-32', 'h-10'],
	},
	defaults: { size: 'md' as const },
} as const
