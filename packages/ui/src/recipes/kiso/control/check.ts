/**
 * Control archetype — check-input branch. `hidden` overlays a native input
 * on top of the custom surface so keyboard, focus, and form semantics work
 * while the design system owns the visible chrome. `surface` paints the
 * visible box / circle with the standard hover and disabled treatment.
 *
 * Layer: kiso · Archetype: control · Concern: check
 */

import { mode } from '../../../core/recipe'
import { hannou } from '../hannou'
import { sen } from '../sen'

export const check = {
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
