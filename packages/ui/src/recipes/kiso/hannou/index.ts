/**
 * Hannou (反応): response. Interaction feedback (hover, press, focus,
 * disabled, cursor) plus the kata-shaped item / nav surfaces
 * that compose those primitives. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { cursor } from './cursor'
import { disabled } from './disabled'
import { fg } from './fg'
import { item } from './item'
import { nav } from './nav'
import { tint } from './tint'

export const hannou = {
	item,
	/** Nav-item chrome in layers (`base`, `tint`, `focus`), so katas can re-seat the surface on a wrapper row. */
	nav,
	/** Disabled / dormant state. */
	disabled,
	/** Cursor feedback: pointer when interactive, not-allowed when disabled. */
	cursor,
	/** Hover/focus tint: mode-neutral wash on the active surface. */
	tint,
	/** Foreground (text-colour) feedback on hover / focus / disabled / current. */
	fg,
} as const
