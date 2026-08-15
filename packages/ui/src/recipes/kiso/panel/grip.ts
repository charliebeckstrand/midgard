/**
 * Panel archetype: the drag grip. Shared by drawer and sheet.
 *
 * Layer: kiso · Archetype: panel · Concern: grip
 */

import { mode } from '../../../core/recipe'

/** The grip's own look, which is the same bar whichever way it lies. */
const BAR = ['rounded-full', ...mode('bg-zinc-950/20', 'dark:bg-white/25')]

export const grip = {
	/**
	 * The bar the reader sees and aims at, keyed by the line the separator draws
	 * — the same word its `aria-orientation` says, and not the axis it resizes: a
	 * grip standing on the inner edge of a right-hand sheet is vertical and moves
	 * the width.
	 */
	bar: {
		horizontal: ['h-1.5 w-10', ...BAR],
		vertical: ['h-10 w-1.5', ...BAR],
	},
} as const
