/**
 * Hannou item: menu/option item chrome shared by `kata/option`,
 * `kata/menu`, and `kata/command-palette`. Composes interaction state
 * primitives (`disabled`, `cursor`, `tint`, the glass-parent state)
 * with text color, type size, and rounded corners.
 *
 * The padding is not here. Menu and Option pad each row with stepped classes,
 * so the row takes the step of the nearest density scope. A plain padding class
 * here is outside the density layers, and it wins over the stepped padding.
 *
 * Layer: kiso · Concern: item interaction surface
 */

import { iro } from '../iro'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { sen } from '../sen'

import { cursor } from './cursor'
import { disabled } from './disabled'
import { glassItem } from './glass-item'
import { tint } from './tint'

const { text } = iro
const { size } = ji
const { rounded } = kasane
const { forced } = sen

export const item = [
	rounded.lg,
	'outline-hidden',
	text.default,
	size.md,
	forced.text,
	forced.focus,
	disabled,
	cursor,
	tint,
	glassItem,
]
