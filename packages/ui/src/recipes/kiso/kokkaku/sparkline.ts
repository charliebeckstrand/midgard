/**
 * Kokkaku skeleton: sparkline. A plain rounded block on the chart's
 * width × height silhouette per size step, standing in for the drawn series.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the sparkline does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: sparkline
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const sparkline = {
	base: ['inline-block', rounded.sm, 'density-w-[18,24,30]', 'density-h-[6,8,10]'],
	density: true,
} as const
