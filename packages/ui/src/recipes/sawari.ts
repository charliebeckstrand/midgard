/**
 * Sawari (触り) — Touch response.
 *
 * How an element reacts to hover, press, and selection — the tactile
 * feedback that tells you something is alive under your finger.
 */

import { sumi } from './sumi'

export const sawari = {
	/** Base interaction pattern for selectable menu items (Dropdown, Listbox, Combobox) */
	item: [
		'cursor-default rounded-lg py-2.5 sm:py-1.5',
		'outline-hidden',
		`text-base/6 ${sumi.base}`,
		'focus:bg-blue-600 focus:text-white',
		'hover:bg-blue-600 hover:text-white',
		'data-disabled:opacity-50',
		'forced-colors:text-[CanvasText]',
		'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
	],

	/** Navigation item interaction — subtle bg tint on hover/active, icon fill transitions */
	nav: [
		'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
		'*:data-[slot=icon]:fill-zinc-500',
		'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
		'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
		'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
		'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-zinc-400',
		'active:bg-zinc-950/10 active:*:data-[slot=icon]:fill-zinc-950',
		'data-current:group-hover:!bg-transparent',
		'dark:data-current:group-hover:!bg-transparent',
		'data-current:active:!bg-transparent',
		'dark:data-current:active:!bg-transparent',
	],

	/** Tab interaction — text color shifts between inactive and current */
	tab: [
		'text-zinc-500 dark:text-zinc-400',
		'data-current:text-zinc-950 dark:data-current:text-white',
		'not-data-current:hover:text-zinc-700',
		'dark:not-data-current:hover:text-zinc-200',
	],
}
