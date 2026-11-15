/**
 * Kokkaku skeleton: segment. The rounded-box silhouette of the segment
 * control; the height adds the `p-1` chrome to the item height at each size
 * step. Widths are defaults; override via `className`.
 *
 * Each step is a stepped `density-*` class, so the silhouette takes the
 * step of its nearest density scope, as the segment control does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: segment
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const segment = {
	base: [rounded.lg, dan.size.segment.base, dan.size.segment.width],
	density: true,
} as const
