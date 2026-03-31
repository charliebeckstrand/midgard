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
import { katachi } from './katachi'
import { ki } from './ki'
import { ma } from './ma'
import { sumi } from './sumi'

/** The surface of an input element — text, bg, border, hover, focus, invalid, disabled */
const input = [
	// Layout
	'relative block w-full',
	// Height
	'min-h-11',
	// Text
	`${sumi.base} text-base/6 placeholder:text-zinc-500`,
	// Background
	'bg-transparent',
	// Border
	`border ${kage.base}`,
	// Hover
	'hover:border-zinc-950/20',
	'dark:hover:border-white/20',
	// Focus
	'focus:outline-hidden',
	// Invalid
	'data-invalid:border-red-600',
	'data-invalid:hover:border-red-600',
	// Read-only
	'read-only:bg-transparent dark:read-only:bg-transparent',
	// Disabled
	'disabled:border-zinc-950/20',
	'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
	'dark:hover:disabled:border-white/15',
	'disabled:cursor-not-allowed',
]

export const omote = {
	/** Elevated panel surface — modals, dialogs, sheets */
	panel: `bg-white shadow-lg dark:bg-zinc-900 forced-colors:outline ${kage.ring}`,

	/** Content card surface — layout containers, sidebars */
	card: `bg-white shadow-xs dark:bg-zinc-900 ${kage.ringUsui}`,

	/** Desktop content area surface — the card treatment applied at lg: breakpoint */
	content: `lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10`,

	/** The outer chrome of a form control (Input, Select, Textarea, Combobox) */
	control: [
		// Layout
		'relative block w-full',
		// Background on wrapper so it's visible through all child element types
		'bg-white rounded-lg dark:bg-white/5',
		// Before pseudo — visual border/shadow
		'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-sm',
		'dark:before:hidden',
		// After pseudo — focus ring
		'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
		'focus-within:after:ring-2 not-has-[[data-invalid]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600',
		'data-open:after:ring-2 not-has-[[data-invalid]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600',
		// Invalid — red ring at rest, focus-within overrides to ring-2
		'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
		// Disabled
		'has-[>:disabled]:opacity-50 has-[>:disabled]:before:bg-zinc-950/5 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed',
	],

	/** Hidden native input base — positioning, focus, disabled, forced-colors (checkbox, radio, switch) */
	hiddenInput: [
		'absolute inset-0 appearance-none cursor-pointer',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
		ki.offset,
	],

	/** Checkable input surface — extends hiddenInput with unchecked border/bg and hover states (checkbox, radio) */
	check: [
		'absolute inset-0 appearance-none cursor-pointer',
		'border border-zinc-950/15 bg-white shadow-xs dark:border-white/15 dark:bg-white/5',
		'not-disabled:hover:border-zinc-950/30 dark:not-disabled:hover:border-white/30',
		'not-disabled:checked:hover:opacity-90',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
		ki.offset,
	],

	/** The surface of an input element — text, bg, border, hover, focus, invalid, disabled */
	input,

	/** Complete form input base: input surface + control spacing + rounded corners */
	formInput: [...input, ma.control, katachi.maru],

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

	/** Dialog overlay surface */
	backdrop: 'fixed inset-0 bg-zinc-950/25 backdrop-blur-xs dark:bg-zinc-950/50',

	/** Mobile sidebar backdrop surface */
	sidebar: 'fixed inset-0 bg-black/30 backdrop-blur-xs',

	/** Popover menu surface (Dropdown, Listbox, Combobox) */
	popover: [
		'isolate min-w-full rounded-xl p-1 select-none',
		'outline outline-transparent focus:outline-hidden',
		'overflow-y-auto overscroll-contain',
		'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
		'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
	],
}
