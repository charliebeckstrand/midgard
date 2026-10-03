/**
 * Kokkaku skeleton: segment. Rounded-box silhouette of the segment
 * control; height folds the `p-1` chrome over the item height per size
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
	base: [rounded.lg, dan.size.segment, dan.size.segmentWidth],
	density: true,
} as const
