/**
 * Hannou (反応): response. Interaction feedback (hover, press, focus,
 * disabled, cursor) plus the kata-shaped item / nav surfaces
 * that compose those primitives. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { active } from './active'
import { cursor, grab } from './cursor'
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
	/** A surface the reader drags: the grab cursors, and the touch and selection rules a drag needs (`default`). */
	grab,
	/** Hover/focus tint and its forms. */
	tint,
	/** Roved-item wash: `data-active` background at the intensity of `tint.base`, for listbox keyboard cursors. */
	active,
	/** Foreground (text-color) feedback on hover / disabled / current. */
	fg,
} as const
