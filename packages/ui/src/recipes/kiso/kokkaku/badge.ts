/**
 * Kokkaku skeleton: badge. Pill silhouette across the four badge size
 * steps. Each step is a `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the badge does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: badge
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const badge = {
	base: [rounded.md, 'density-h-[5.5,6.5,7.5,8.5,8.5]', 'density-w-[10,12,14,16,16]'],
	density: true,
} as const
