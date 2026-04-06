/**
 * Shared form class compositions.
 *
 * Pre-composed class bundles for form components that intentionally
 * cross recipe concern boundaries (surface + interaction + disabled + sizing).
 *
 * Tier: 2
 * Concern: form
 */

import { kage } from '../recipes/kage'
import { ki } from '../recipes/ki'
import { maru } from '../recipes/maru'
import { sumi } from '../recipes/sumi'
import { take } from '../recipes/take'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	inputBase: [
		'relative block w-full',
		'bg-transparent border',
		'focus:outline-hidden',
		'read-only:bg-transparent',
	],
	control: [
		'relative block w-full',
		maru.rounded,
		'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-sm',
		'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
		'focus-within:after:ring-2 not-has-[[data-invalid]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600',
		'data-open:after:ring-2 not-has-[[data-invalid]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600',
		'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
		'has-[>:disabled]:opacity-50 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed',
	],
	hidden: [
		'absolute inset-0 appearance-none cursor-pointer',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
		ki.offset,
	],
	check: [
		'absolute inset-0 appearance-none cursor-pointer',
		'shadow-xs',
		'not-disabled:checked:hover:opacity-90',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
		ki.offset,
	],
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	inputBase: [
		'placeholder:text-zinc-500',
		'hover:border-zinc-950/20',
		'data-invalid:border-red-600 data-invalid:hover:border-red-600',
		'disabled:border-zinc-950/20 disabled:cursor-not-allowed',
	],
	control: ['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5'],
	check: ['border border-zinc-950/15 bg-white', 'not-disabled:hover:border-zinc-950/30'],
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	inputBase: [
		'dark:placeholder:text-zinc-400',
		'dark:hover:border-white/20',
		'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
		'dark:hover:disabled:border-white/15',
	],
	control: ['dark:bg-white/5', 'dark:before:hidden'],
	check: ['dark:border-white/15 dark:bg-white/5', 'dark:not-disabled:hover:border-white/30'],
}

// ── Composed (internal) ─────────────────────────────────
const inputBase = [sumi.text, kage.border, motoi.inputBase, hiru.inputBase, yoru.inputBase]

// ── Export ───────────────────────────────────────────────
export const form = {
	control: [motoi.control, hiru.control, yoru.control],
	hidden: motoi.hidden,
	check: [motoi.check, hiru.check, yoru.check],
	inputBase,
	input: [...inputBase, take.control.md, maru.rounded],
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
