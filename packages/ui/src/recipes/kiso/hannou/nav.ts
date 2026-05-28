/**
 * Hannou nav — nav-item chrome shared by `kata/nav` and `kata/sidebar`.
 * Composes the icon-slot size, a low-alpha hover tint, and the inset
 * focus indicator.
 *
 * Layer: kiso · Concern: nav-item interaction surface
 */

import { sen } from '../sen'
import { shaku } from '../shaku'

export const nav = [
	shaku.icon.md,
	'group-hover:bg-zinc-950/5',
	'dark:text-white',
	'dark:group-hover:bg-white/5',
	sen.focus.inset,
]
