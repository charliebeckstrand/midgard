/**
 * Segment archetype — per-segment item. Layout, focus chrome, disabled
 * and cursor states, sized by the same axis as the outer control.
 *
 * Layer: kiso · Archetype: segment · Concern: item
 */

import { hannou } from '../hannou'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { sen } from '../sen'

const { cursor, disabled } = hannou
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

export const item = {
	base: [
		flex.row,
		'justify-center',
		'whitespace-nowrap',
		rounded.lg,
		'outline-none',
		weight.medium,
		'select-none',
		focus.indicator,
		focus.ring,
		...disabled,
		...cursor,
	],
	size: {
		sm: [size.xs, 'px-2.5 py-1'],
		md: [size.sm, 'px-3 py-1.5'],
		lg: [size.md, 'px-4 py-2'],
	},
} as const
