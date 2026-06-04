/**
 * Control archetype — density axis. Padding + radius + child-gap dimension.
 *
 * Affix padding (`affix.prefix`, `affix.suffix`) is the same axis — keyed
 * by density step, not size step. Corner radius matches `py` at every step
 * for a constant 1:1 padding-to-radius ratio across non-ControlFrame
 * controls (listbox, combobox, date-picker button); for ControlFrame
 * consumers (input, textarea, select trigger), `kata/control.ts` exposes
 * `frameRadius` and `<ControlFrame>` reads it from `useDensity()` so the
 * chrome on the wrapping frame carries the matching radius. Gap = py/2 at
 * every step (rounded to the spacing scale).
 *
 * Layer: kiso · Archetype: control · Concern: density
 */

import { kasane } from '../kasane'

const { padding, radius, gap } = kasane

export const density = {
	sm: [padding.px('2.5'), padding.py('1.5'), radius.r('1.5'), gap.g('0.75')],
	md: [padding.px('3'), padding.py('2'), radius.r('2'), gap.g('1')],
	lg: [padding.px('3.5'), padding.py('2.5'), radius.r('2.5'), gap.g('1.25')],
} as const
