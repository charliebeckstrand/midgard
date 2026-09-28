/**
 * Control archetype: density axis. Padding, radius, and child gap.
 *
 * Each class is a stepped `density-*` utility. The control takes the step of
 * its nearest density scope, and a control with an explicit `size` writes that
 * scope on its own frame. So the classes are the same at each step, and the
 * control reads no context. Three values give `sm`, `md`, and `lg`. `xs` takes
 * the `sm` value, and `xl` takes the `lg` value.
 *
 * The radius is the same as `py` at each step. The padding-to-radius ratio is
 * thus 1:1 across the controls with no ControlFrame (listbox, combobox,
 * date-picker button). For a ControlFrame consumer (input, textarea, select
 * trigger), `kata/control.ts` gives `frameRadius` to the frame. The gap is half
 * of `py` at each step, rounded to the spacing scale.
 *
 * The axis also carries the affix autofill margins (`affix.autofill`, see
 * `./affix.ts`). They are `group-has` gated `autofill:` margins that inset the
 * autofill highlight of the browser from an adjacent affix slot by `px`. They
 * are on this axis, so each control input gets them with no wiring in its
 * kata. The gate keeps them dormant in a frame with no slot.
 *
 * Layer: kiso · Archetype: control · Concern: density
 */

import { affix } from './affix'

export const density = [
	'density-px-ring-[2.5,3,3.5]',
	'density-py-ring-[1.5,2,2.5]',
	'density-rounded-[1.5,2,2.5]',
	'density-gap-[0.75,1,1.25]',
	affix.autofill.prefix,
	affix.autofill.suffix,
] as const
