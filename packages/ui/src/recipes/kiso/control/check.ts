/**
 * Control archetype — check-input branch. `hidden` overlays a native input
 * on top of the custom surface, keeping keyboard, focus, and form semantics
 * on the native element. `surface` paints the visible box / circle with the
 * standard hover and disabled treatment.
 *
 * `base` pre-assembles the layout shell (position, inline-flex centering,
 * focus outline, cursor states) plus the surface fragment as a single
 * importable fragment.
 *
 * Layer: kiso · Archetype: control · Concern: check
 */

import { mode } from '../../../core/recipe'
import { hannou } from '../hannou'
import { narabi } from '../narabi'
import { sen } from '../sen'

const { cursor, fg } = hannou
const { flex } = narabi
const { focus, forced } = sen

/** Visually hidden native input overlaying the custom check surface. */
const hidden = ['absolute inset-0', 'opacity-0', ...cursor, forced.control]

/** Custom check surface (the visible box / circle). */
const surface = [
	...mode(
		[
			'bg-white',
			'border border-zinc-950/15',
			'not-has-[:disabled]:hover:border-zinc-950/30 not-has-[:disabled]:group-hover/field:border-zinc-950/30',
		],
		[
			'dark:bg-white/5',
			'dark:border-white/15',
			'dark:not-has-[:disabled]:hover:border-white/30 dark:not-has-[:disabled]:group-hover/field:border-white/30',
		],
	),
	'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
]

/** Layout shell — position, inline-flex centering, focus outline, cursor. */
const shell = ['relative', flex.inline, 'justify-center', focus.outline, ...cursor]

/** Pre-assembled chrome: shell + surface. The applicator's standard base. */
const base = [...shell, ...surface]

/**
 * Checked-state accent colours shared by the checkbox and radio kata: each
 * injects the foreground mark, fill, and border into `--check-mark` /
 * `--check-bg` / `--check-border` for one accent. zinc diverges per component
 * (checkbox uses a neutral fill, radio a high-contrast one), so each kata
 * defines its own zinc and spreads these four. Literal class strings for
 * static extraction by Tailwind's scanner.
 */
const color = {
	red: '[--check-mark:var(--color-white)] [--check-bg:var(--color-red-600)] [--check-border:var(--color-red-800)]/90',
	amber:
		'[--check-mark:var(--color-amber-100)] [--check-bg:var(--color-amber-700)] [--check-border:var(--color-amber-600)]/80',
	green:
		'[--check-mark:var(--color-white)] [--check-bg:var(--color-green-600)] [--check-border:var(--color-green-800)]/90',
	blue: '[--check-mark:var(--color-white)] [--check-bg:var(--color-blue-600)] [--check-border:var(--color-blue-800)]/90',
} as const

export const check = {
	hidden,
	surface,
	shell,
	base,
	color,
	/** Disabled-state text class for the surrounding field wrapper. */
	disabled: fg.disabled,
} as const
