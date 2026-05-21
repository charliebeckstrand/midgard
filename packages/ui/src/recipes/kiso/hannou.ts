/**
 * Hannou (反応) — response.
 *
 * Interaction feedback — hover, press, selection, focus, and disabled
 * (dormant) state.
 *
 * Layer: kiso · Concern: interaction
 */

import { mode } from '../../core/recipe'

import { iro } from './iro'
import { ji } from './ji'
import { sen } from './sen'
import { shaku } from './shaku'
import { ugoki } from './ugoki'

// Hover/focus highlight for items inside a glass parent. Lives here as a state
// concern, even though the surface chrome that triggers it lives in `omote`.
const glassItem = [
	'group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-zinc-950/10',
	'group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-zinc-950/10',
	'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-white/10',
	'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:focus:bg-white/10',
]

const disabled = [
	'disabled:opacity-50',
	'data-disabled:opacity-50',
	'group-disabled:opacity-50',
	ugoki.css.opacity,
	ugoki.css.duration,
]

// Single source of truth for cursor feedback. `cursor-pointer` is the base;
// the four `cursor-not-allowed` variants win on specificity when the element
// itself is disabled (`:disabled` / `data-disabled`) or wraps a disabled
// descendant (`has-[:disabled]` / `has-[data-disabled]`). Keeping the base
// at one-class specificity also lets parent overrides like
// `has-disabled:**:cursor-not-allowed` win for sibling-label patterns.
const cursor = [
	'cursor-pointer',
	'disabled:cursor-not-allowed',
	'data-disabled:cursor-not-allowed',
	'has-[:disabled]:cursor-not-allowed',
	'has-[data-disabled]:cursor-not-allowed',
]

// Hover / focus tint for menu and listbox items — mode-neutral wash at low
// alpha on the active surface.
const itemTint = mode(
	[
		'not-disabled:not-data-disabled:hover:bg-zinc-950/5',
		'not-disabled:not-data-disabled:focus:bg-zinc-950/5',
	],
	[
		'dark:not-disabled:not-data-disabled:hover:bg-white/5',
		'dark:not-disabled:not-data-disabled:focus:bg-white/5',
	],
)

const item = [
	iro.text.default,
	'rounded-lg',
	'sm:py-1.5 py-2.5',
	'outline-hidden',
	ji.md,
	sen.forced.text,
	sen.forced.focus,
	disabled,
	cursor,
	itemTint,
	glassItem,
]

const nav = [
	shaku.icon.md,
	'group-hover:bg-zinc-950/5',
	'dark:text-white',
	'dark:group-hover:bg-white/5',
	sen.focus.inset,
]

export const hannou = {
	item,
	nav,
	/** Disabled / dormant state. */
	disabled,
	/** Cursor feedback — pointer when interactive, not-allowed when disabled. */
	cursor,
}
