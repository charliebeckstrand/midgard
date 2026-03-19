/**
 * Sawari (触り) — Touch response.
 *
 * How an element reacts to hover, press, and selection — the tactile
 * feedback that tells you something is alive under your finger.
 *
 * Branch of: Ki (root)
 * Concern: interaction
 */

import { katachi } from './katachi'
import { sumi } from './sumi'

export const sawari = {
	/** Base interaction pattern for selectable menu items (Dropdown, Listbox, Combobox) */
	item: [
		// Layout
		'cursor-default rounded-lg py-2.5 sm:py-1.5',
		'outline-hidden',
		// Text
		`text-base/6 ${sumi.base}`,
		// Focus
		'focus:bg-blue-600 focus:text-white',
		// Hover
		'hover:bg-blue-600 hover:text-white',
		// Disabled
		'data-disabled:opacity-50',
		// Forced colors
		'forced-colors:text-[CanvasText]',
		'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
	],

	/** Navigation item interaction — subtle bg tint on hover/active, icon fill transitions (Navbar, Sidebar) */
	nav: [
		// Icon slots — sizing from shared recipe, secondary fill
		...katachi.iconSlot,
		'*:data-[slot=icon]:fill-zinc-500',
		'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
		// Animate text color and icon fill to match ActiveIndicator spring
		'transition-[color,fill] duration-150 delay-75',
		'*:data-[slot=icon]:transition-[fill] *:data-[slot=icon]:duration-150 *:data-[slot=icon]:delay-75',
		// Avatar slots
		'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
		// Hover (non-current only — current items use ActiveIndicator)
		'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
		'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-white',
		// Pressed (non-current only, stronger tint)
		'active:bg-zinc-950/10 active:*:data-[slot=icon]:fill-zinc-950',
		'dark:active:bg-white/10 dark:active:*:data-[slot=icon]:fill-white',
		// Current — override hover/active bg to keep it stable
		'data-current:group-hover:!bg-transparent',
		'dark:data-current:group-hover:!bg-transparent',
		'data-current:active:!bg-transparent',
		'dark:data-current:active:!bg-transparent',
	],

	/** Tab interaction — text color shifts between inactive (secondary) and current (primary) */
	tab: [
		// Inactive
		'text-zinc-500 dark:text-zinc-400',
		// Current
		'data-current:text-zinc-950 dark:data-current:text-white',
		// Hover (inactive only)
		'not-data-current:hover:text-zinc-700',
		'dark:not-data-current:hover:text-zinc-200',
	],
}
