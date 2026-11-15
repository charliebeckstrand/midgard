/**
 * Kokkaku skeleton: rating. One star-shaped square; the component repeats it
 * per star, because the silhouette's width is the star count and not a size
 * step.
 *
 * The skeleton puts each square in the `glyph` slot and the row in the root
 * of the Rating kata, so the star size and the gap of the row are the ones of
 * the real rating.
 *
 * Layer: kiso · Concern: skeleton form · Unit: rating
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const rating = {
	base: [rounded.sm],
} as const
