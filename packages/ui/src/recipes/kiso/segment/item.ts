/**
 * Segment archetype: per-segment item. Layout, focus chrome, disabled
 * and cursor states. The padding and the text follow the nearest density scope,
 * as the outer control does.
 *
 * Layer: kiso · Archetype: segment · Concern: item
 */

import { dan } from '../dan'
import { hannou } from '../hannou'
import { iro } from '../iro'
import { ji } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { sen } from '../sen'

const { cursor, disabled, fg } = hannou
const { on } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

export const item = {
	base: [
		flex.row,
		'justify-center',
		// A label stays on one line while the control fits its container. Where it
		// does not, the item shrinks to its longest word and the label wraps.
		'text-center text-balance',
		rounded.lg,
		weight.medium,
		// iOS Safari can select the text in a child of a `select-none` item on a long
		// press, so the children also set it.
		'select-none *:select-none',
		// The selected item steps to full-strength ink and the rest stay muted — the
		// muted/`data-current` pairing the underline tab carries, which this had no counterpart
		// for: every item rendered at one color, so the indicator behind the active one was the
		// only thing marking it. That reads as a highlight sitting on the strip rather than as a
		// selected item, and it leaves the distinction resting entirely on a fill (WCAG 1.4.1).
		//
		// `on.wash.muted`, not `muted`: an item sits on the control's own wash track,
		// which `muted` is not legal over. See `iro/ramp.ts`.
		...on.wash.muted,
		...fg.current,
		focus.indicator,
		focus.ring,
		...disabled,
		...cursor,
		`${dan.text.small} ${dan.space.segment.item.x} ${dan.space.row.y}`,
		// An icon is the small text size plus 4 px, as an icon beside body text is.
		dan.size.icon.small,
		'*:data-[slot=icon]:shrink-0',
		dan.gap.item,
	],
} as const
