/**
 * Sen divider: separator lines. `top` is the `border-t` frame used
 * between standalone rows in a stacked layout; `between` paints
 * `divide-y` on the parent, and direct children get an interior rule
 * without each owning a border.
 *
 * Layer: kiso · Concern: dividers
 */

import { mode } from '../../../core/recipe'

import { tone } from './tone'

export const divider = {
	/** Top border: `border-t` with subtle colour. */
	top: ['border-t', ...tone.borderSubtle],
	/** Children separator: `divide-y` on the parent. */
	between: mode('divide-y divide-zinc-950/10', 'dark:divide-white/10'),
} as const
