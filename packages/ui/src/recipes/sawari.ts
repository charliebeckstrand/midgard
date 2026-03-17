/**
 * Sawari (触り) — Touch response.
 *
 * How an element reacts to hover, press, and selection — the tactile
 * feedback that tells you something is alive under your finger.
 *
 * Branch of: Ki (root)
 * Concern: interaction
 */

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
}
