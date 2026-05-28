/**
 * Control archetype — the framed surface that wraps a user-input element.
 *
 * Consumed by input, textarea, listbox, combobox, date-picker, checkbox,
 * radio, and ControlFrame. Exposes class fragments (frame, surface, input,
 * density, size, affix, resets, check) that each kata composes into its own
 * recipe.
 */

import { affix } from './affix'
import { check } from './check'
import { density } from './density'
import { frame } from './frame'
import { input } from './input'
import { resets } from './resets'
import { size } from './size'
import { surface } from './surface'

export const control = {
	frame,
	surface,
	input,
	density,
	size,
	affix,
	resets,
	check,
} as const
