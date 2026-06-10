/**
 * Kokkaku skeleton: color-panel. The picker's overall block silhouette across
 * the three control size steps; chrome, sliders, and swatches collapse into one
 * placeholder rectangle.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-panel
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const colorPanel = {
	base: rounded.lg,
	size: {
		sm: 'h-64 w-56',
		md: 'h-72 w-64',
		lg: 'h-80 w-72',
	},
	defaults: { size: 'md' as const },
} as const
