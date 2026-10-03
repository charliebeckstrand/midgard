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

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

// The height of a button at each step. The calendar skeleton reads it too.
const height = dan.size.button

export const button = {
	base: [rounded.lg, height, dan.size.buttonWidth],
	height,
	density: true,
} as const
