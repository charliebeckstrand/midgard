/**
 * Shared form class compositions.
 *
 * These are pre-composed class bundles for form components that intentionally
 * cross recipe concern boundaries (surface + interaction + disabled + sizing).
 * They live here in primitives rather than in recipes because recipes are
 * single-concern tokens.
 */

import { kage, ki, maru, sumi, take } from '../recipes'

/** The surface of an input element — text, bg, border, hover, focus, invalid, disabled */
const input = [
	sumi.text,
	kage.border,
	'relative block w-full',
	'text-base/6 placeholder:text-zinc-500',
	'bg-transparent border',
	'hover:border-zinc-950/20 dark:hover:border-white/20',
	'focus:outline-hidden',
	'data-invalid:border-red-600 data-invalid:hover:border-red-600',
	'read-only:bg-transparent dark:read-only:bg-transparent',
	'disabled:border-zinc-950/20 disabled:cursor-not-allowed',
	'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
	'dark:hover:disabled:border-white/15',
]

export const form = {
	/** The outer chrome of a form control (Input, Select, Textarea, Combobox) */
	control: [
		// Layout
		'relative block w-full',
		// Background on wrapper so it's visible through all child element types
		maru.rounded,
		'bg-white dark:bg-white/5',
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

	/** Checkable input surface — border/bg/hover for unchecked state (checkbox, radio) */
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
	formInput: [...input, take.control, maru.rounded],

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
	],
}
