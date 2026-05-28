/**
 * Hannou item — menu/option item chrome shared by `kata/option`,
 * `kata/menu`, and `kata/command-palette`. Composes interaction state
 * primitives (`disabled`, `cursor`, `tint`, the glass-parent state)
 * with text colour, type size, and rounded corners.
 *
 * Layer: kiso · Concern: item interaction surface
 */

import { iro } from '../iro'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { sen } from '../sen'

import { cursor } from './cursor'
import { glassItem } from './glass-item'
import { disabled } from './state'
import { tint } from './tint'

export const item = [
	'py-2.5 sm:py-1.5',
	kasane.rounded.lg,
	'outline-hidden',
	iro.text.default,
	ji.md,
	sen.forced.text,
	sen.forced.focus,
	disabled,
	cursor,
	tint,
	glassItem,
]
