/**
 * Hannou nav — nav-item chrome shared by `kata/nav` and `kata/sidebar`.
 * Composes the icon-slot size, a low-alpha hover tint, and the inset
 * focus indicator.
 *
 * Layer: kiso · Concern: nav-item interaction surface
 */

import { mode } from '../../../core/recipe'
import { sen } from '../sen'
import { shaku } from '../shaku'

const { focus } = sen
const { icon } = shaku

export const nav = [
	icon.md,
	...mode('group-hover:bg-zinc-950/5', 'dark:group-hover:bg-white/5'),
	...mode('text-zinc-950', 'dark:text-white'),
	focus.inset,
]
