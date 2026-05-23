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

// Tracks the `density` axis of the Density token (padding + radius +
// child-gap dimension). Affix padding (`affix.prefix`, `affix.suffix`)
// below is the same axis — keyed by the density step, not the size step.
// Corner radius matches `py` at every step for a constant 1:1
// padding-to-radius ratio across non-ControlFrame controls (listbox,
// combobox, date-picker button); for ControlFrame consumers (input,
// textarea, select trigger), `kata/control.ts` exposes `frameRadius` and
// `<ControlFrame>` reads it from `useDensity()` so the chrome on the
// wrapping frame carries the matching radius. Gap = py/2 at every step
// (rounded to the spacing scale).
const density = {
	sm: [kasane.px('2.5'), kasane.py('1.5'), kasane.r('1.5'), kasane.g('0.75')],
	md: [kasane.px('3'), kasane.py('2'), kasane.r('2'), kasane.g('1')],
	lg: [kasane.px('3.5'), kasane.py('2.5'), kasane.r('2.5'), kasane.g('1.25')],
} as const

// Tracks the `size` axis of the Density token (text + icon dimension).
const size = {
	sm: ji.sm,
	md: ji.md,
	lg: ji.lg,
} as const

// Equidistance invariant: affix padding equals `input.px` so a text
// affix's *content* sits the same distance from chrome as input-text
// does in an affix-less control. When the slot hosts an element that
// carries its own outer chrome — a non-bare `<Button>`, a `<Badge>`,
// or anything else that opts in via `data-padded` — the affix padding
// shrinks by that element's own `pl` so its *content* lands at the
// same position. The compensation collapses to a constant `1`
// spacing-unit at every density step because `affixStepDown`
// (`primitives/affix/affix.ts`) moves the slot's child one notch down
// per density step, and both scales grow 0.5 per notch — the
// increments cancel. The boundary test at
// `__tests__/recipes/boundary/affix-compensation-boundary.test.ts`
// pins this against the live recipes.
const affix = {
	prefix: {
		sm: [kasane.pl('2.5'), 'has-[[data-padded]]:pl-[calc(--spacing(1)-1px)]'],
		md: [kasane.pl('3'), 'has-[[data-padded]]:pl-[calc(--spacing(1)-1px)]'],
		lg: [kasane.pl('3.5'), 'has-[[data-padded]]:pl-[calc(--spacing(1)-1px)]'],
	},
	suffix: {
		sm: [kasane.pr('2.5'), 'has-[[data-padded]]:pr-[calc(--spacing(1)-1px)]'],
		md: [kasane.pr('3'), 'has-[[data-padded]]:pr-[calc(--spacing(1)-1px)]'],
		lg: [kasane.pr('3.5'), 'has-[[data-padded]]:pr-[calc(--spacing(1)-1px)]'],
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
