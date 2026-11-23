/**
 * Kokkaku skeleton: color-picker. The silhouette of the ColorPicker trigger:
 * a box with the height of a control that fills its parent, as the trigger
 * does. Two empty spans give the content width, which a parent that is as
 * wide as its content reads. The box takes the inline padding and the gap of
 * the trigger, the first span is as large as the swatch, and the
 * second span is as wide as the hex value in the mono font of the trigger.
 * Each measure is a stepped `density-*` class, so the box matches the trigger
 * at each step.
 *
 * `hex` holds `#RRGGBB` and `alpha` holds `#RRGGBBAA`.
 *
 * Layer: kiso · Concern: skeleton form · Unit: color-picker
 */

import { dan } from '../dan'
import { control } from './control'

export const colorPicker = {
	base: [
		...control.base,
		...control.fill,
		'flex items-center',
		dan.space.control.x,
		dan.gap.control,
	],
	swatch: ['shrink-0', dan.size.check.box],
	value: {
		base: ['min-w-0', 'font-mono', dan.text.body],
		hex: 'w-[7ch]',
		alpha: 'w-[9ch]',
	},
} as const
