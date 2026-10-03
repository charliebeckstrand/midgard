/**
 * Control archetype: the framed surface that wraps a user-input element.
 *
 * Consumed by input, textarea, select, listbox, combobox, date-picker,
 * color-picker, checkbox, radio, switch, rating, and ControlFrame. Exposes
 * class fragments (frame, surface, reset, input, density, radius, affix,
 * resets, check) that each kata composes into its own recipe.
 */

import { affix } from './affix'
import { check } from './check'
import { density, radius, scale } from './density'
import { frame } from './frame'
import { input } from './input'
import { reset } from './reset'
import { resets } from './resets'
import { surface } from './surface'

export const control = {
	frame,
	surface,
	reset,
	input,
	density,
	radius,
	scale,
	affix,
	resets,
	check,
} as const
