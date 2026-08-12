/**
 * Segment archetype: per-segment item. Layout, focus chrome, disabled
 * and cursor states, sized by the same axis as the outer control.
 *
 * Layer: kiso · Archetype: segment · Concern: item
 */

import { hannou } from '../hannou'
import { iro } from '../iro'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { sen } from '../sen'

const { cursor, disabled, fg } = hannou
const { text } = iro
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
		weight.medium,
		'select-none',
		// The selected item steps to full-strength ink and the rest stay muted — the same
		// muted/`data-current` pair the underline tab carries, which this had no counterpart for:
		// every item rendered at one colour, so the indicator behind the active one was the only
		// thing marking it. That reads as a highlight sitting on the strip rather than as a
		// selected item, and it leaves the distinction resting entirely on a fill (WCAG 1.4.1).
		text.muted,
		...fg.current,
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
