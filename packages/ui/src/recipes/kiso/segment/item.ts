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

export const item = {
	base: [
		narabi.row,
		'justify-center',
		'whitespace-nowrap',
		kasane.rounded.lg,
		'outline-none',
		ji.weight.medium,
		'select-none',
		sen.focus.indicator,
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
	],
	size: {
		sm: [ji.xs, 'px-2.5 py-1'],
		md: [ji.sm, 'px-3 py-1.5'],
		lg: [ji.md, 'px-4 py-2'],
	},
} as const
