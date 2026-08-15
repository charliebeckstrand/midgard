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
import { glassItem } from './glass-item'
import { item } from './item'
import { nav } from './nav'
import { tint } from './tint'
import { tintFilled } from './tint-filled'
import { tintSurface } from './tint-surface'

export const hannou = {
	item,
	/** Nav-item chrome in layers (`base`, `tint`, `focus`), so katas can re-seat the surface on a wrapper row. */
	nav,
	/** Disabled / dormant state. */
	disabled,
	/** Cursor feedback: pointer when interactive, not-allowed when disabled. */
	cursor,
	/** A surface the reader drags: the grab cursors, and the touch and selection rules a drag needs. */
	grab,
	/** Hover/focus tint: mode-neutral wash on the active surface. */
	tint,
	/** {@link tint} at double strength, applied only inside a glass parent, where 5% reads as nothing. */
	glassItem,
	/** {@link tint} one step up, for a surface carrying a translucent fill. */
	tintFilled,
	/** The opaque hover step, for a surface on `omote.bg.surface` that a wash would make see-through. */
	tintSurface,
	/** Roved-item wash: `data-active` background at `tint`'s intensity, for listbox keyboard cursors. */
	active,
	/** Foreground (text-colour) feedback on hover / focus / disabled / current. */
	fg,
} as const
