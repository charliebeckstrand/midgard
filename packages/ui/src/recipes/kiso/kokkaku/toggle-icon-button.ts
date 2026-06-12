/**
 * Kokkaku skeleton: toggle-icon-button. Square silhouette of the
 * icon-only bare button: icon dimension plus padding floor per size
 * step.
 *
 * Layer: kiso · Concern: skeleton form · Unit: toggle-icon-button
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const toggleIconButton = {
	base: rounded.lg,
	size: {
		xs: 'size-4.5',
		sm: 'size-6',
		md: 'size-7.5',
		lg: 'size-9',
	},
	defaults: { size: 'md' as const },
} as const
