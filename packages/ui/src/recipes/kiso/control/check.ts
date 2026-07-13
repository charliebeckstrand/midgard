/**
 * Control archetype: check-input branch. `hidden` overlays a native input
 * on top of the custom surface; keyboard, focus, and form semantics stay
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

/**
 * Validation ring keyed off the overlaid input's `data-*` state: red / amber /
 * green, mirroring the framed-control kasane layers. The native input sits
 * inside the surface, so the box / circle / track `has` the attribute. Literal
 * class strings; Tailwind's scanner extracts them statically.
 */
const validation = [
	'has-[[data-invalid]]:ring-2 has-[[data-invalid]]:ring-danger-600',
	'has-[[data-warning]]:ring-2 has-[[data-warning]]:ring-warning-500',
	'has-[[data-valid]]:ring-2 has-[[data-valid]]:ring-success-600',
]

/** Custom check surface (the visible box / circle). */
const surface = [
	...mode(
		[
			'bg-white',
			'border border-neutral-950/15',
			'not-has-[:disabled]:hover:border-neutral-950/30 not-has-[:disabled]:group-has-[[data-slot=label]:hover]/field:border-neutral-950/30',
		],
		[
			'dark:bg-white/5',
			'dark:border-white/15',
			'dark:not-has-[:disabled]:hover:border-white/30 dark:not-has-[:disabled]:group-has-[[data-slot=label]:hover]/field:border-white/30',
		],
	),
	'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
	...validation,
]

/** Layout shell: position, inline-flex centering, focus outline, cursor. */
const shell = ['relative', flex.inline, 'justify-center', focus.outline, ...cursor]

/** Pre-assembled chrome: shell + surface. The applicator's standard base. */
const base = [...shell, ...surface]

/**
 * Checked-state accent colours shared by the checkbox and radio kata: each
 * injects the foreground mark, fill, and border into `--check-mark` /
 * `--check-bg` / `--check-border` for one accent. neutral diverges per
 * component (checkbox uses a mid fill, radio a high-contrast one); each kata
 * defines its own neutral and spreads these four. Literal class strings;
 * Tailwind's scanner extracts them statically.
 */
const color = {
	danger:
		'[--check-mark:var(--color-white)] [--check-bg:var(--color-danger-600)] [--check-border:var(--color-danger-800)]/90',
	warning:
		'[--check-mark:var(--color-warning-100)] [--check-bg:var(--color-warning-700)] [--check-border:var(--color-warning-600)]/80',
	success:
		'[--check-mark:var(--color-white)] [--check-bg:var(--color-success-600)] [--check-border:var(--color-success-800)]/90',
	primary:
		'[--check-mark:var(--color-white)] [--check-bg:var(--color-primary-600)] [--check-border:var(--color-primary-800)]/90',
} as const

export const check = {
	hidden,
	surface,
	shell,
	base,
	color,
	/** Validation ring fragment keyed off the overlaid input's `data-*` state; spread by the switch track, already folded into `surface` for checkbox / radio. */
	validation,
	/** Disabled-state text class for the surrounding field wrapper. */
	disabled: fg.disabled,
} as const
