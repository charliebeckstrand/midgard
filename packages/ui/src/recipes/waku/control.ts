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
 *   - `density`   — border-compensated padding, keyed by the density axis.
 *   - `size`      — font size, keyed by the size axis.
 *   - `icon`      — chevron / affix slot layout.
 *   - `affix`     — prefix / suffix slot padding (tracks density).
 *   - `resets`    — browser-default resets keyed by input type.
 *   - `check`     — visually hidden native input + custom check surface.
 *
 * Exposes plain class fragments (`string[]`) and fragment maps. Per the
 * waku wire-format contract, `tv()` is invoked only at the kata public
 * surface; consumers compose these fragments into whatever shape they need.
 *
 * Layer: waku · Concern: control field archetype
 */

import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { tsunagi } from '../ryu/tsunagi'
import { kasane } from './kasane'

// `tsunagi.base` is data-attribute-gated, so it stays inert until a `<Group>`
// stamps `data-group` / `data-group-orientation` onto the frame. Including it
// here is what lets every ControlFrame-based component (Input, Listbox,
// Combobox, Textarea, …) participate in `<Group>` without per-component wiring.
const frame = ['group/control flex items-center', 'relative w-full', ...kasane.all, ...tsunagi.base]

const surface = {
	default: [
		'bg-white',
		'dark:bg-white/5',
		'has-[>:disabled]:before:bg-zinc-950/5',
		'dark:before:hidden',
	],
	outline: [...sen.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
	glass: ['bg-transparent', omote.blur.md],
} as const

const field = [
	'gap-sm',
	'relative',
	'w-full min-w-0 flex-1',
	'border-0',
	'bg-transparent',
	'focus:outline-hidden',
	'read-only:bg-transparent',
	...iro.text.default,
	'placeholder:text-zinc-500',
	'dark:placeholder:text-zinc-400',
]

// Tracks the `density` axis of the Density token (padding + gap dimension).
// Affix padding (`affix.prefix`, `affix.suffix`, `affix.autofill`) below is
// the same axis — keyed by the density step, not the size step.
const density = {
	sm: 'px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)]',
	md: 'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]',
	lg: 'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)]',
} as const

// Tracks the `size` axis of the Density token (text + icon dimension).
const size = {
	sm: ji.size.sm,
	md: ji.size.md,
	lg: ji.size.lg,
} as const

const icon = ['flex items-center', 'pr-2', 'pointer-events-none']

const affix = {
	prefix: {
		sm: 'pl-[calc(--spacing(2.5)-1px)] has-[button]:pl-[calc(--spacing(1.5)-1px)]',
		md: 'pl-[calc(--spacing(3)-1px)] has-[button]:pl-[calc(--spacing(2)-1px)]',
		lg: 'pl-[calc(--spacing(3.5)-1px)] has-[button]:pl-[calc(--spacing(2.5)-1px)]',
	},
	suffix: {
		sm: 'pr-[calc(--spacing(2.5)-1px)] has-[button]:pr-[calc(--spacing(1.5)-1px)]',
		md: 'pr-[calc(--spacing(3)-1px)] has-[button]:pr-[calc(--spacing(2)-1px)]',
		lg: 'pr-[calc(--spacing(3.5)-1px)] has-[button]:pr-[calc(--spacing(2.5)-1px)]',
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

const resets = {
	number: [
		'[appearance:textfield]',
		'[&::-webkit-inner-spin-button]:m-0',
		'[&::-webkit-inner-spin-button]:appearance-none',
		'[&::-webkit-outer-spin-button]:appearance-none',
	],
}

const check = {
	/** Visually hidden native input overlaying the custom check surface. */
	hidden: ['absolute inset-0', 'opacity-0', ...sawari.cursor, sen.forced.control],
	/** Custom check surface (the visible box / circle). */
	surface: [
		'bg-white',
		'border',
		'border-zinc-950/15',
		'not-has-[:disabled]:hover:border-zinc-950/30',
		'not-has-[:disabled]:group-hover/field:border-zinc-950/30',
		'dark:bg-white/5',
		'dark:border-white/15',
		'dark:not-has-[:disabled]:hover:border-white/30',
		'dark:not-has-[:disabled]:group-hover/field:border-white/30',
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
	],
}

export const control = {
	frame,
	surface,
	field,
	density,
	size,
	icon,
	affix,
	resets,
	check,
} as const
