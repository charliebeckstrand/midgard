/**
 * Control archetype: the framed surface that wraps a user-input element.
 *
 * Consumed by input, textarea, select, listbox, combobox, date-picker,
 * color-picker, checkbox, radio, switch, rating, and ControlFrame. Exposes
 * class fragments (frame, surface, reset, input, button, density, radius,
 * scale, affix, check) that each kata composes into its own recipe.
 * `reset.base` strips the inner element, and `reset.number` hides the spinners
 * of a number input.
 */

import { affix } from './affix'
import { button } from './button'
import { check } from './check'
import { density, radius, scale } from './density'
import { frame } from './frame'
import { input } from './input'
import { reset } from './reset'
import { surface } from './surface'

export const control = {
	frame,
	surface,
	reset,
	input,
	button,
	density,
	radius,
	scale,
	affix,
	check,
} as const
