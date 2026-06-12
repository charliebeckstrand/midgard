/**
 * Control archetype: density axis. Padding + radius + child-gap dimension.
 *
 * Affix padding (`affix.prefix`, `affix.suffix`) is the same axis, keyed
 * by density step, not size step. Corner radius matches `py` at every
 * step; the padding-to-radius ratio holds 1:1 across non-ControlFrame
 * controls (listbox, combobox, date-picker button). For ControlFrame
 * consumers (input, textarea, select trigger), `kata/control.ts` exposes
 * `frameRadius`, `<ControlFrame>` reads it from `useDensity()`, and the
 * chrome on the wrapping frame carries the matching radius. Gap = py/2 at
 * every step (rounded to the spacing scale).
 *
 * Each step also carries the affix autofill margins (`affix.autofill`,
 * see `./affix.ts`): `group-has`-gated `autofill:` margins that inset the
 * browser's autofill highlight from an adjacent affix slot by `px`. They
 * live on this axis so every control input picks them up without
 * per-kata wiring; the gate keeps them dormant in slot-less frames.
 *
 * Layer: kiso · Archetype: control · Concern: density
 */

import { kasane } from '../kasane'
import { affix } from './affix'

const { padding, radius, gap } = kasane

export const density = {
	sm: [
		padding.px('2.5'),
		padding.py('1.5'),
		radius.r('1.5'),
		gap.g('0.75'),
		affix.autofill.prefix.sm,
		affix.autofill.suffix.sm,
	],
	md: [
		padding.px('3'),
		padding.py('2'),
		radius.r('2'),
		gap.g('1'),
		affix.autofill.prefix.md,
		affix.autofill.suffix.md,
	],
	lg: [
		padding.px('3.5'),
		padding.py('2.5'),
		radius.r('2.5'),
		gap.g('1.25'),
		affix.autofill.prefix.lg,
		affix.autofill.suffix.lg,
	],
} as const
