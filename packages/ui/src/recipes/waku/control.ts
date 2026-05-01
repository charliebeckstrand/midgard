/**
 * Single source of truth for the control family — every recipe whose visual
 * identity is "a framed surface that wraps a user-input element".
 *
 * Consumers (input, textarea, listbox, combobox, datepicker, checkbox, radio,
 * and the ControlFrame primitive) compose from here rather than redefining any
 * of these concerns. If a new shared control concern emerges, add it here.
 *
 * Owns:
 *   - `frame`     — outer chrome: composes `kasane` (the 4-layer signature) +
 *                   block layout.
 *   - `surface`   — surface chrome variants (default / outline / glass).
 *   - `field`     — inner field reset: transparent bg, no native outline,
 *                   placeholder colour, disabled cursor.
 *   - `size`      — density: border-compensated padding + font size.
 *   - `icon`      — chevron / affix slot layout.
 *   - `affix`     — prefix / suffix slot padding (tracks density).
 *   - `resets`    — browser-default resets keyed by input type.
 *   - `check`     — visually hidden native input + custom check surface.
 *
 * Not exposed as a `tv()` recipe — consumers vary in whether they use tv,
 * raw class arrays, or both, so this file exposes plain class fragments and
 * lets each consumer compose them in whatever shape it needs.
 *
 * Layer: waku · Concern: control field archetype
 */

import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { kasane } from './kasane'

// ── Outer frame chrome ──────────────────────────────────
const frame = ['relative block w-full', ...kasane.all]

// ── Surface variants for the frame ──────────────────────
const surface = {
	default: [
		'bg-white',
		'has-[>:disabled]:before:bg-zinc-950/5',
		'dark:bg-white/5',
		'dark:before:hidden',
	],
	outline: [...sen.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
	glass: ['bg-transparent', omote.blur.md],
} as const

// ── Inner field reset (placeholder, transparent bg, no outline) ──
const field = [
	...iro.text.default,
	'relative',
	'w-full min-w-0 flex-1',
	'border-0',
	'bg-transparent',
	'focus:outline-hidden',
	'read-only:bg-transparent',
	'placeholder:text-zinc-500',
	'dark:placeholder:text-zinc-400',
]

// ── Density: border-compensated padding + font size ─────
const size = {
	sm: ['px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)]', ji.size.sm],
	md: ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', ji.size.md],
	lg: ['px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)]', ji.size.lg],
} as const

// ── Affix slot layout (chevron, prefix, suffix) ─────────
const icon = ['flex items-center', 'pr-2', 'pointer-events-none']

const affix = {
	prefix: {
		sm: 'pl-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pl-1',
		md: 'pl-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pl-1.5',
		lg: 'pl-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pl-1.5',
	},
	suffix: {
		sm: 'pr-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pr-1',
		md: 'pr-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pr-1.5',
		lg: 'pr-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pr-1.5',
	},
	autofill: {
		prefix: {
			sm: 'autofill:ml-[calc(--spacing(2.5)-1px)] peer-has-[button]/prefix:autofill:ml-1',
			md: 'autofill:ml-[calc(--spacing(3)-1px)] peer-has-[button]/prefix:autofill:ml-1.5',
			lg: 'autofill:ml-[calc(--spacing(3.5)-1px)] peer-has-[button]/prefix:autofill:ml-2',
		},
		suffix: {
			sm: 'autofill:mr-[calc(--spacing(2.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1',
			md: 'autofill:mr-[calc(--spacing(3)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1.5',
			lg: 'autofill:mr-[calc(--spacing(3.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-2',
		},
	},
} as const

// ── Browser-default resets per input type ───────────────
const resets = {
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
	number: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
	],
}

// ── Checkbox / radio: hidden native input + custom surface ──
const check = {
	/** Visually hidden native input overlaying the custom check surface. */
	hidden: ['absolute inset-0', 'opacity-0', ...sawari.cursor, sen.forced.control],
	/** Custom check surface (the visible box / circle). */
	surface: [
		'border',
		'shadow-xs',
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
		'border-zinc-950/15',
		'bg-white',
		'not-has-[:disabled]:hover:border-zinc-950/30',
		'not-has-[:disabled]:group-hover/field:border-zinc-950/30',
		'dark:border-white/15',
		'dark:bg-white/5',
		'dark:not-has-[:disabled]:hover:border-white/30',
		'dark:not-has-[:disabled]:group-hover/field:border-white/30',
	],
}

export const control = {
	frame,
	surface,
	field,
	size,
	icon,
	affix,
	resets,
	check,
} as const

export type ControlSize = keyof typeof control.size
export type ControlSurface = keyof typeof control.surface
