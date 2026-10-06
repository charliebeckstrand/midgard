/**
 * Sen divider: separator lines. `top` is the `border-t` frame used
 * between standalone rows in a stacked layout. `between` paints
 * `divide-y` on the parent, and direct children get an interior rule
 * without each owning a border.
 *
 * Layer: kiso · Concern: dividers
 */

import { mode } from '../../../core/recipe'

import { contrastMore, tone } from './tone'

export const divider = {
	/** Top border: `border-t` with subtle color. */
	top: ['border-t', ...tone.borderSubtle],
	/** Children separator: `divide-y` on the parent. */
	between: mode(
		['divide-y divide-zinc-950/10', contrastMore.divide.light],
		['dark:divide-white/10', contrastMore.divide.dark],
	),
} as const
