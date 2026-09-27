/**
 * Kokkaku skeleton: chart. A plain rounded block on the chart frame's
 * silhouette per size step: full width at the step's plot height. It stands
 * in for the axes, marks, and legend of a loading chart.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the chart does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: chart
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const chart = {
	base: ['block', 'w-full', rounded.md, 'density-h-[40,60,80]'],
	density: ['sm', 'md', 'lg'],
} as const
