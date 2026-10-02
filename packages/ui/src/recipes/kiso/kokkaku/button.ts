/**
 * Kokkaku skeleton: button. Rounded-lg silhouette across the four
 * button size steps. The heights match the labeled button: 22, 30, 38, and
 * 46px. The widths are defaults.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the button does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: button
 */

import { kasane } from '../kasane'

const { rounded } = kasane

// The height of a button at each step. The calendar skeleton reads it too.
const height = 'density-h-[5.5,7.5,9.5,11.5,11.5]'

export const button = {
	base: [rounded.lg, height, 'density-w-[16,20,24,28,28]'],
	height,
	density: true,
} as const
