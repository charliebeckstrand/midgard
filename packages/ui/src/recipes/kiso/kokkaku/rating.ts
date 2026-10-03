/**
 * Kokkaku skeleton: rating. One star-shaped square; the component repeats it
 * per star, because the silhouette's width is the star count and not a size
 * step.
 *
 * `star` is the glyph size of the real star, and `gap` is the gap of the
 * rating row. The Rating kata reads both. Each is a stepped `density-*` class,
 * so the silhouette takes the step of its nearest density scope, as the rating
 * does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: rating
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const rating = {
	base: [rounded.sm],
	star: dan.size.checkBox,
	gap: dan.gap.rating,
} as const
