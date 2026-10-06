/**
 * Kokkaku skeleton: color-picker. The silhouette of the ColorPicker trigger:
 * a box with the height of a control, as wide as the swatch and the color
 * value. Two empty spans give the width. The box takes the inline padding and
 * the gap of the trigger, the first span is as large as the swatch, and the
 * second span is as wide as the hex value in the mono font of the trigger.
 * Each measure is a stepped `density-*` class, so the box matches the trigger
 * at each step.
 *
 * `hex` holds `#RRGGBB` and `alpha` holds `#RRGGBBAA`.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-picker
 */

import { dan } from '../dan'
import { ji } from '../ji'
import { control } from './control'

export const colorPicker = {
	base: [
		...control.base,
		'flex w-fit max-w-full items-center',
		dan.space.control.x,
		dan.gap.control,
	],
	swatch: ['shrink-0', dan.size.check.box],
	value: {
		base: ['min-w-0 font-mono', ji.ramp],
		hex: 'w-[7ch]',
		alpha: 'w-[9ch]',
	},
} as const
