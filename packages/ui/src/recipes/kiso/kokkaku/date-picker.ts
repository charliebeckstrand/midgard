/**
 * Kokkaku skeleton: date-picker. The silhouette of the DatePicker trigger: a
 * box with the height of a control, as wide as a date and the calendar icon.
 * Two empty spans give the width. The box takes the inline padding and the gap
 * of the trigger. The first span is as wide as a date in the text of the
 * trigger. The second span is as large as the calendar icon. Each measure is a
 * stepped `density-*` class, so the box follows the trigger at each step.
 *
 * The digits of a date do not have the same width, so the width of a date
 * changes with its value. `date` holds a date such as 6/15/2026, and `range`
 * holds two such dates and the dash between them.
 *
 * Layer: kiso · Concern: skeleton form · Unit: date-picker
 */

import { dan } from '../dan'
import { ji } from '../ji'
import { control } from './control'

export const datePicker = {
	base: [
		...control.base,
		'flex w-fit max-w-full items-center',
		dan.space.control.x,
		dan.gap.datePicker,
	],
	value: {
		base: ['min-w-0', ji.ramp],
		date: 'w-[6.5ch]',
		range: 'w-[14ch]',
	},
	// The icon of the trigger is in a slot scope, one step below the trigger.
	icon: ['shrink-0', dan.size.icon.base],
} as const
