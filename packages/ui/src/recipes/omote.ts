/**
 * Omote (面) — Surfaces.
 *
 * The face of a thing — backgrounds, chrome, backdrops. Everything that
 * establishes a visual plane for content to sit on.
 *
 * Branch of: Sumi (root)
 * Concern: color, chrome
 */

import { kage } from './kage'
import { sumi } from './sumi'

export const omote = {
	/** Elevated panel surface — modals, dialogs, alerts */
	panel: `bg-white shadow-lg ${kage.ring} dark:bg-zinc-900 forced-colors:outline`,

	/** Content card surface — layout containers, sidebars */
	card: `bg-white shadow-xs ${kage.ringUsui} dark:bg-zinc-900`,

	/** The outer chrome of a form control (Input, Select, Textarea, Combobox) */
	control: [
		// Layout
		'relative block w-full',
		// Before pseudo — visual border/shadow
		'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
		'dark:before:hidden',
		// After pseudo — focus ring
		'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
		'focus-within:after:ring-2 focus-within:after:ring-blue-600',
		// Disabled
		'has-[:disabled]:opacity-50 has-[:disabled]:before:bg-zinc-950/5 has-[:disabled]:before:shadow-none',
	],

	/** The surface of an input element — text, bg, border, hover, focus, invalid, disabled */
	input: [
		// Text
		`text-base/6 ${sumi.base} placeholder:text-zinc-500`,
		// Background
		'bg-transparent',
		'dark:bg-white/5',
		// Border
		`border ${kage.base}`,
		// Hover
		'hover:border-zinc-950/20',
		'dark:hover:border-white/20',
		// Focus
		'focus:outline-hidden',
		// Invalid
		'data-invalid:border-red-600',
		'dark:data-invalid:border-red-700',
		'data-invalid:hover:border-red-600',
		'dark:data-invalid:hover:border-red-700',
		// Disabled
		'disabled:border-zinc-950/20',
		'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
		'dark:hover:disabled:border-white/15',
	],

	/** WebKit date/time picker surface normalisation */
	date: [
		'[&::-webkit-datetime-edit-fields-wrapper]:p-0',
		'[&::-webkit-date-and-time-value]:min-h-[1.5em]',
		'[&::-webkit-datetime-edit]:inline-flex',
		'[&::-webkit-datetime-edit]:p-0',
		'[&::-webkit-datetime-edit-year-field]:p-0',
		'[&::-webkit-datetime-edit-month-field]:p-0',
		'[&::-webkit-datetime-edit-day-field]:p-0',
		'[&::-webkit-datetime-edit-hour-field]:p-0',
		'[&::-webkit-datetime-edit-minute-field]:p-0',
		'[&::-webkit-datetime-edit-second-field]:p-0',
		'[&::-webkit-datetime-edit-millisecond-field]:p-0',
		'[&::-webkit-datetime-edit-meridiem-field]:p-0',
	],

	/** Dialog/alert overlay surface */
	backdrop: 'fixed inset-0 bg-zinc-950/25 dark:bg-zinc-950/50',

	/** Alert-specific overlay with scroll and padding */
	alert: [
		'fixed inset-0 flex w-screen justify-center overflow-y-auto',
		'px-2 py-2 sm:px-6 sm:py-8 lg:px-8 lg:py-16',
		// Light
		'bg-zinc-950/15',
		// Focus
		'focus:outline-0',
		// Dark
		'dark:bg-zinc-950/50',
	].join(' '),

	/** Mobile sidebar backdrop surface */
	sidebar: 'fixed inset-0 bg-black/30',

	/** Popover menu surface (Dropdown, Listbox, Combobox) */
	popover: [
		'isolate min-w-full rounded-xl p-1 select-none',
		'outline outline-transparent focus:outline-hidden',
		'overflow-y-auto overscroll-contain',
		'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
		'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
	],
}
