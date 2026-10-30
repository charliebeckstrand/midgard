/**
 * Kokkaku skeleton: button. Silhouette across the five button size
 * steps, with the stepped radius of the button. The heights match the
 * labeled button: 26, 32, 38, 44, and 50px. The widths are defaults.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the button does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: button
 */

import { dan } from '../dan'

// The height of a button at each step. The chart legend reads it too.
const height = dan.size.button.base

export const button = {
	base: [dan.radius.button, height, dan.size.button.width],
	height,
	density: true,
	// Inline-level, as the `inline-flex` button is, so the silhouette can stand in
	// for a button in a line of text, a paragraph included.
	inline: true,
} as const
