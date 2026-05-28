/**
 * Control archetype — check-input branch. `hidden` overlays a native input
 * on top of the custom surface so keyboard, focus, and form semantics work
 * while the design system owns the visible chrome. `surface` paints the
 * visible box / circle with the standard hover and disabled treatment.
 *
 * `base` pre-assembles the layout shell (position, inline-flex centering,
 * focus outline, cursor states) plus the surface fragment, so the
 * applicator imports one named fragment instead of composing inline.
 *
 * Layer: kiso · Archetype: control · Concern: check
 */

import { mode } from '../../../core/recipe'
import { hannou } from '../hannou'
import { narabi } from '../narabi'
import { sen } from '../sen'

/** Visually hidden native input overlaying the custom check surface. */
const hidden = ['absolute inset-0', 'opacity-0', ...hannou.cursor, sen.forced.control]

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
const shell = ['relative', narabi.inlineRow, 'justify-center', sen.focus.outline, ...hannou.cursor]

/** Pre-assembled chrome: shell + surface. The applicator's standard base. */
const base = [...shell, ...surface]

export const check = {
	hidden,
	surface,
	shell,
	base,
} as const
