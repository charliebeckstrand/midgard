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

export const density = {
	sm: [kasane.px('2.5'), kasane.py('1.5'), kasane.r('1.5'), kasane.g('0.75')],
	md: [kasane.px('3'), kasane.py('2'), kasane.r('2'), kasane.g('1')],
	lg: [kasane.px('3.5'), kasane.py('2.5'), kasane.r('2.5'), kasane.g('1.25')],
} as const
