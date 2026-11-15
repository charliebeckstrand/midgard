/**
 * Omote checkerboard: the pattern behind a translucent color, in each mode. The
 * color panel and the color picker read it. Each one adds its own tile size
 * (`bg-size-[…]`), because the size of a tile follows the size of the
 * box.
 *
 * Layer: kiso · Concern: surface pattern
 */

import { mode } from '../../../core/recipe'

export const checkerboard = mode(
	'bg-[repeating-conic-gradient(var(--color-zinc-300)_0_25%,var(--color-white)_0_50%)]',
	'dark:bg-[repeating-conic-gradient(var(--color-zinc-700)_0_25%,var(--color-zinc-600)_0_50%)]',
)
