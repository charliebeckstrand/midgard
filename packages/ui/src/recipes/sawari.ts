/**
 * Sawari (触り) — Touch response.
 *
 * How an element reacts to hover, press, and selection — the tactile
 * feedback that tells you something is alive under your finger.
 *
 * Branch of: Sawari (root)
 * Concern: interaction
 */

import { ki } from './ki'
import { maru } from './maru'
import { narabi } from './narabi'
import { sumi } from './sumi'
import { take } from './take'

/** Base interaction pattern for selectable menu items (Dropdown, Listbox, Combobox) */
const item = [
	sumi.base,
	maru.rounded,
	'cursor-default py-2.5 outline-hidden sm:py-1.5',
	'text-base/6',
	'hover:bg-zinc-950/5 focus:bg-zinc-950/5',
	'dark:hover:bg-white/5 dark:focus:bg-white/5',
	'data-disabled:opacity-50',
	'forced-color-adjust-none forced-colors:text-[CanvasText]',
	'forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
]

/** Navigation item interaction — subtle bg tint on hover/active, icon fill transitions */
const nav = [
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500',
	'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7',
	'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
	'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
	'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-zinc-400',
	'active:bg-zinc-950/10 active:*:data-[slot=icon]:fill-zinc-950',
	'data-current:group-hover:!bg-transparent data-current:active:!bg-transparent',
	'dark:data-current:group-hover:!bg-transparent dark:data-current:active:!bg-transparent',
]

export const sawari = {
	item,
	nav,

	/** Tab interaction — text color shifts between inactive and current */
	tab: [
		'text-zinc-500 dark:text-zinc-400',
		'data-current:text-zinc-950 dark:data-current:text-white',
		'not-data-current:hover:text-zinc-700 dark:not-data-current:hover:text-zinc-200',
	],

	/** Composed: navigation item interaction + focus + icon sizing */
	navItem: [...nav, ki.offset, take.icon],

	/** Composed: selectable option in a menu/list — interaction + icon/avatar slot layout */
	option: [...item, ...narabi.item],
}
