/**
 * Kokkaku skeleton: color-panel. The picker's overall block silhouette across
 * the three control size steps; chrome, sliders, and swatches collapse into one
 * placeholder rectangle. The box matches the panel at each step.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the picker does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-panel
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const colorPanel = {
	base: [rounded.lg, 'density-h-[76.5,98,120]', 'density-w-[72,80,88]'],
	density: true,
} as const
