/**
 * Kokkaku skeleton: chart. A plain rounded block on the chart frame's
 * silhouette per size step — full width at the step's plot height, standing
 * in for the axes, marks, and legend of a loading chart.
 *
 * Layer: kiso · Concern: skeleton form · Unit: chart
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const chart = {
	base: ['block', 'w-full', rounded.md],
	size: {
		sm: 'h-40',
		md: 'h-60',
		lg: 'h-80',
	},
	defaults: { size: 'md' as const },
} as const
