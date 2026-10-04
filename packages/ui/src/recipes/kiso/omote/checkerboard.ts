/**
 * Omote checkerboard: the pattern behind a translucent color, in each mode. The
 * color panel and the color picker read it. Each one adds its own tile size
 * (`[background-size:…]`), because the size of a tile follows the size of the
 * box.
 *
 * Layer: kiso · Concern: surface pattern
 */

import { mode } from '../../../core/recipe'

export const checkerboard = mode(
	'[background-image:repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)]',
	'dark:[background-image:repeating-conic-gradient(#3f3f46_0_25%,#52525b_0_50%)]',
)
