/**
 * Hannou item — menu/option item chrome shared by `kata/option`,
 * `kata/menu`, and `kata/command-palette`. Composes interaction state
 * primitives (`disabled`, `cursor`, the glass-parent state) with text
 * colour, type size, rounded corners, and a low-alpha hover/focus wash.
 *
 * The `itemTint` constant — the mode-neutral hover/focus background —
 * is the only inline composite that stays local; it has no other
 * consumer.
 *
 * Layer: kiso · Concern: item interaction surface
 */

import { mode } from '../../../core/recipe'
import { iro } from '../iro'
import { ji } from '../ji'
import { sen } from '../sen'

import { cursor } from './cursor'
import { glassItem } from './glass-item'
import { disabled } from './state'

const itemTint = mode(
	'not-disabled:not-data-disabled:hover:bg-zinc-950/5 not-disabled:not-data-disabled:focus:bg-zinc-950/5',
	'dark:not-disabled:not-data-disabled:hover:bg-white/5 dark:not-disabled:not-data-disabled:focus:bg-white/5',
)

export const item = [
	'py-2.5 sm:py-1.5',
	'rounded-lg',
	'outline-hidden',
	iro.text.default,
	ji.md,
	sen.forced.text,
	sen.forced.focus,
	disabled,
	cursor,
	itemTint,
	glassItem,
]
