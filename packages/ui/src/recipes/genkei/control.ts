/**
 * Control family archetype — the framed surface that wraps a user-input element.
 *
 * Consumed by input, textarea, listbox, combobox, date-picker, checkbox, radio,
 * and ControlFrame. Exposes class fragments (frame, surface, input, density,
 * size, affix, resets, check) that each kata composes into its own recipe.
 */

import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, omote, sen, tsunagi } from '../kiso'

// `tsunagi.base` is data-attribute-gated, so it stays inert until a `<Group>`
// stamps `data-group` / `data-group-orientation` onto the frame. Including it
// here is what lets every ControlFrame-based component (Input, Listbox,
// Combobox, Textarea, …) participate in `<Group>` without per-component wiring.
const frame = ['group/control flex items-center', 'relative w-full', ...kasane.all, ...tsunagi.base]

const surface = {
	default: mode(
		['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5'],
		['dark:bg-white/5', 'dark:before:hidden'],
	),
	outline: [...sen.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
	glass: ['bg-transparent', omote.blur.md],
} as const

const input = [
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
	sm: ji.sm,
	md: ji.md,
	lg: ji.lg,
} as const

const affix = {
	prefix: {
		sm: [
			'pl-[calc(--spacing(2.5)-1px)]',
			'has-[button:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			'pl-[calc(--spacing(3)-1px)]',
			'has-[button:not([data-variant=bare])]:pl-[calc(--spacing(2)-1px)]',
		],
		lg: [
			'pl-[calc(--spacing(3.5)-1px)]',
			'has-[button:not([data-variant=bare])]:pl-[calc(--spacing(2.5)-1px)]',
		],
	},
	suffix: {
		sm: [
			'pr-[calc(--spacing(2.5)-1px)]',
			'has-[button:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			'pr-[calc(--spacing(3)-1px)]',
			'has-[button:not([data-variant=bare])]:pr-[calc(--spacing(2)-1px)]',
		],
		lg: [
			'pr-[calc(--spacing(3.5)-1px)]',
			'has-[button:not([data-variant=bare])]:pr-[calc(--spacing(2.5)-1px)]',
		],
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
	hidden: ['absolute inset-0', 'opacity-0', ...hannou.cursor, sen.forced.control],
	/** Custom check surface (the visible box / circle). */
	surface: [
		'border',
		...mode(
			[
				'bg-white',
				'border-zinc-950/15',
				'not-has-[:disabled]:hover:border-zinc-950/30',
				'not-has-[:disabled]:group-hover/field:border-zinc-950/30',
			],
			[
				'dark:bg-white/5',
				'dark:border-white/15',
				'dark:not-has-[:disabled]:hover:border-white/30',
				'dark:not-has-[:disabled]:group-hover/field:border-white/30',
			],
		),
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
	],
}

export const control = {
	frame,
	surface,
	input,
	density,
	size,
	affix,
	resets,
	check,
} as const
