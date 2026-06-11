/**
 * Hannou nav: nav-item chrome shared by `kata/nav` and `kata/sidebar`,
 * split into layers so a kata can re-seat the interaction surface on a
 * wrapper row (affixed items): `base` stays on the item while `tint` and
 * `focus` move up to the row.
 *
 * Layer: kiso · Concern: nav-item interaction surface
 */

import { mode } from '../../../core/recipe'
import { sen } from '../sen'
import { shaku } from '../shaku'

const { focus } = sen
const { icon } = shaku

export const nav = {
	/** Identity sans surface: icon-slot size + ink. */
	base: [icon.md, ...mode('text-zinc-950', 'dark:text-white')],
	/** Low-alpha hover wash. */
	tint: mode('hover:bg-zinc-950/5', 'dark:hover:bg-white/5'),
	/** Inset keyboard-focus indicator. */
	focus: focus.inset,
} as const
