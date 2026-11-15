/**
 * Kokkaku skeleton: rating. One star-shaped square; the component repeats it
 * per star, because the silhouette's width is the star count and not a size
 * step.
 *
 * The skeleton puts each square in the `glyph` slot of the Rating kata, and
 * the row in its root. Thus the star size and the row gap are those of the
 * real rating.
 *
 * Layer: kiso · Concern: skeleton form · Unit: rating
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const rating = {
	base: [rounded.sm],
} as const
