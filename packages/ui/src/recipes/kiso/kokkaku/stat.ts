/**
 * Kokkaku skeleton: stat. One silhouette per Stat slot. Each height matches the
 * line height of the live slot. The widths are defaults, and `className` can
 * change them.
 *
 * Each height is a ramp, so each silhouette takes the step of its nearest
 * density scope, as the slot does. The value silhouette also has a stepped
 * width.
 *
 * Layer: kiso · Concern: skeleton form · Unit: stat
 */

import { dan } from '../dan'

export const stat = {
	value: { base: [dan.text.h1, 'h-lh', dan.size.stat.value.width], density: true },
	label: { base: [dan.text.small, 'h-lh w-24'] },
	description: { base: [dan.text.small, 'h-lh w-20'] },
	delta: { base: [dan.text.small, 'h-lh w-12'] },
} as const
