/**
 * Hannou (反応): response. Interaction feedback: hover, press, focus,
 * disabled, busy, and cursor. One file per concern; this barrel assembles the
 * named bundle that every kata reads. The row chrome that composes these
 * tokens is a group (`kumi/item`).
 */

import { active } from './active'
import { busy } from './busy'
import { cursor, grab } from './cursor'
import { disabled } from './disabled'
import { fg } from './fg'
import { tint } from './tint'

export const hannou = {
	/** Disabled / dormant state. */
	disabled,
	/** A part that waits on data: the pulse, or a standing dim under reduced motion. */
	busy,
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
