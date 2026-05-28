/**
 * Segment archetype — per-segment item. Layout, focus chrome, disabled
 * and cursor states, sized by the same axis as the outer control.
 *
 * Layer: kiso · Archetype: segment · Concern: item
 */

import { hannou } from '../hannou'
import { ji } from '../ji'
import { sen } from '../sen'

export const item = {
	base: [
		'flex items-center justify-center',
		'font-medium select-none',
		'whitespace-nowrap',
		'rounded-lg',
		sen.focus.indicator,
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
		'outline-none',
	],
	size: {
		sm: ['px-2.5 py-1', ji.xs],
		md: ['px-3 py-1.5', ji.sm],
		lg: ['px-4 py-2', ji.md],
	},
}
