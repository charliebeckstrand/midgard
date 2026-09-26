/**
 * Hannou nav: nav-item chrome shared by `kata/nav`, `kata/sidebar`, and
 * `kata/chat-list-item`. It is split into layers so a kata can re-seat the
 * interaction surface on a wrapper row (affixed items). `base` stays on the
 * item while `tint` and `focus` move up to the row.
 *
 * Layer: kiso · Concern: nav-item interaction surface
 */

import { mode } from '../../../core/recipe'
import { sen } from '../sen'
import { shaku } from '../shaku'

const { focus } = sen
const { icon } = shaku

export const nav = {
	/**
	 * Identity sans surface: icon-slot size + ink. A long press on iOS selects the
	 * label text. On iOS, Safari can select the text in a child of a `select-none`
	 * item, so the children also set it. The headless Button of an item drops the
	 * `select-none` of the button recipe.
	 */
	base: [icon.md, ...mode('text-zinc-950', 'dark:text-white'), 'select-none *:select-none'],
	/** Low-alpha hover wash. */
	tint: mode('hover:bg-zinc-950/5', 'dark:hover:bg-white/5'),
	/** Inset keyboard-focus indicator. */
	focus: focus.inset,
} as const
