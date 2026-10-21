/**
 * Hannou item: the menu/option item row shared by `kata/option`,
 * `kata/menu`, and `kata/command-palette`. `base` is the chrome: it composes
 * interaction state primitives (`disabled`, `cursor`, `tint`, the glass-parent
 * state) with text color, type size, and rounded corners. The other keys are
 * the text parts of the row.
 *
 * The padding is not here. Menu and Option pad each row with stepped classes,
 * so the row takes the step of the nearest density scope. A plain padding class
 * here is outside the density layers, and it wins over the stepped padding.
 *
 * Layer: kiso · Concern: item row
 */

import { iro } from '../iro'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { sen } from '../sen'

import { cursor } from './cursor'
import { disabled } from './disabled'
import { tint } from './tint'

const { on, text } = iro
const { size } = ji
const { rounded } = kasane
const { forced } = sen

export const item = {
	/** The chrome of the row. */
	base: [
		rounded.lg,
		'outline-hidden',
		text.default,
		size.md,
		forced.text,
		forced.focus,
		disabled,
		cursor,
		tint.base,
		tint.glass.base,
	],
	/** The label of the row, on one line. */
	label: 'truncate',
	/** A column that stacks the label over its description. */
	text: narabi.text,
	/**
	 * The description of the row. It takes `on.wash.muted`, not `muted`: `base`
	 * and `hannou.active` ground a hovered or roved row on the tint wash, which
	 * `muted` is not legal over. See `iro/ramp.ts`.
	 */
	description: [narabi.description, on.wash.muted],
	/** The keyboard shortcut of the row, at its end. */
	shortcut: 'ms-auto',
} as const
