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
import { glassItem, glassItemBefore } from './glass-item'
import { item } from './item'
import { nav } from './nav'
import { tint, tintBefore } from './tint'
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
	/** A surface the reader drags: the grab cursors (`cursor`), and with them the touch and selection rules a drag needs (`default`). */
	grab,
	/** Hover/focus tint and its forms. */
	tint: {
		/** Mode-neutral wash on the active surface. */
		base: tint,
		/** `base` on a `::before` layer, for a box that stays square while a rounded inner layer carries the wash. */
		before: tintBefore,
		/** `base` one step up, for a surface carrying a translucent fill. */
		filled: tintFilled,
		/** The opaque hover step, for a surface on `omote.bg.surface` that a wash would make see-through. */
		surface: tintSurface,
		/** The wash inside a glass parent, where 5% reads as nothing. */
		glass: {
			/** `base` at double strength. */
			base: glassItem,
			/** `glass.base` on a `::before` layer, the glass partner of `before`. */
			before: glassItemBefore,
		},
	},
	/** Roved-item wash: `data-active` background at the intensity of `tint.base`, for listbox keyboard cursors. */
	active,
	/** Foreground (text-color) feedback on hover / focus / disabled / current. */
	fg,
} as const
