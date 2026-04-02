/**
 * Omote (面) — Surfaces.
 *
 * The face of a thing — backgrounds, chrome, backdrops. Everything that
 * establishes a visual plane for content to sit on.
 *
 * Pure surface concern only: background colors, backdrop blur, shadow, ring chrome.
 * No sizing, spacing, interaction, or layout.
 *
 * Branch of: Sumi (root)
 * Concern: color, chrome
 */

import { kage } from './kage'

export const omote = {
	/** Elevated panel surface — modals, dialogs, sheets */
	panel: [kage.ring, 'bg-white shadow-lg', 'dark:bg-zinc-900', 'forced-colors:outline'],

	/** Desktop content area surface — the card treatment applied at lg: breakpoint */
	content: [
		'lg:rounded-lg lg:bg-white lg:shadow-xs',
		'lg:ring-1 lg:ring-zinc-950/5',
		'dark:lg:bg-zinc-900 dark:lg:ring-white/10',
	],

	/** Dialog overlay surface — background tint + blur */
	backdrop: 'bg-zinc-950/25 backdrop-blur-xs dark:bg-zinc-950/50',

	/** Popover menu surface — frosted glass with depth (Dropdown, Listbox, Combobox) */
	popover: [
		'bg-white/75 backdrop-blur-xl',
		'shadow-lg ring-1 ring-zinc-950/10',
		'dark:bg-zinc-800/75',
		'dark:ring-white/10 dark:ring-inset',
	],
}
