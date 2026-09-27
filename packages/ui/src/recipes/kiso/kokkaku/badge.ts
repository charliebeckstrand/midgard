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
	base: [
		rounded.md,
		'density-xs:h-5.5 density-sm:h-6.5 density-md:h-7.5 density-lg:h-8.5',
		'density-xs:w-10 density-sm:w-12 density-md:w-14 density-lg:w-16',
	],
	density: ['xs', 'sm', 'md', 'lg'],
} as const
