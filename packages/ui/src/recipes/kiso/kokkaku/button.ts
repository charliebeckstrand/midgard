/**
 * Kokkaku skeleton: button. Rounded-lg silhouette across the four
 * button size steps.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the button does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: button
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const button = {
	base: [rounded.lg, 'density-h-[6,7,9,11,11]', 'density-w-[16,20,24,28,28]'],
	density: ['xs', 'sm', 'md', 'lg'],
} as const
