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

// Hover / focus highlight for items inside a glass parent. Lives here as a
// state concern; the surface chrome that triggers it lives in `omote`.
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

const text = {
	hover: mode('hover:not-disabled:text-zinc-950', 'dark:hover:not-disabled:text-white'),
	focus: mode(
		'focus-visible:not-disabled:text-zinc-950',
		'dark:focus-visible:not-disabled:text-white',
	),
	disabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	current: mode('data-current:text-zinc-950', 'dark:data-current:text-white'),
}

// `cursor-pointer` stays at one-class specificity so the disabled variants
// below override it on the element or its descendants, and so parent
// overrides like `has-disabled:**:cursor-not-allowed` win for sibling-label
// patterns.
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
	/** Text-colour feedback on hover / focus / disabled / current. */
	text,
}
