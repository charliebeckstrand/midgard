/**
 * Sen grip: the ink of a resize grip, the thin bar that a resize handle draws
 * as its `::after`. Resizable and the Grid column resize read it, so the two
 * resize handles look the same. The drag grip of a panel is a different bar
 * (`kumi/panel/grip.ts`).
 *
 * The bar is muted at rest, darker on hover, and blue on keyboard focus. The
 * reader sees the bar only by its background, which forced colors remove, so
 * the bar then paints in `CanvasText` in each state. Forced colors also remove
 * the focus color, so an outline on the bar marks the focused handle there.
 *
 * Layer: kiso · Concern: resize grip
 */

import { mode } from '../../../core/recipe'

export const grip = [
	'after:rounded-full',
	...mode(
		'after:bg-zinc-300 hover:after:bg-zinc-400',
		'dark:after:bg-zinc-600 dark:hover:after:bg-zinc-500',
	),
	'focus-visible:after:bg-blue-500 dark:focus-visible:after:bg-blue-500',
	'forced-colors:after:bg-[CanvasText]',
	// Each state color above outranks the shape, so the shape repeats in each state.
	'forced-colors:hover:after:bg-[CanvasText] forced-colors:focus-visible:after:bg-[CanvasText]',
	'forced-colors:focus-visible:after:outline-solid forced-colors:focus-visible:after:outline-2',
	'forced-colors:focus-visible:after:outline-offset-2 forced-colors:focus-visible:after:outline-[Highlight]',
]
