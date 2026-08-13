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
const { palette } = iro
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
		//
		// The muted rung is the ramp's `onTint`, not the `iro.text.muted` the underline tab reads.
		// The control behind these items is `omote.bg.tint`, and `onSurface` clears AA on the page
		// surface only — zinc-500 over that wash measures 4.35:1, short of 4.5 (WCAG 1.4.3). The
		// underline tab sits on the page itself, so it keeps the lighter rung. `onTint` is the one
		// the ramp guard proves against a wash as well as the page.
		palette.plain.text.zinc,
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
