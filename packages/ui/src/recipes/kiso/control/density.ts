/**
 * Control archetype: density axis. Padding, radius, child gap, and text size.
 *
 * Each class is a stepped `density-*` utility. The control takes the step of
 * its nearest density scope, and a control with an explicit `size` writes that
 * scope on its own frame. So the classes are the same at each step, and the
 * control reads no context. Three values give `sm`, `md`, and `lg`. `xs` takes
 * the `sm` value, and `xl` takes the `lg` value. A control has no `xl` size
 * (`ControlStep`), so only an `xl` scope above the control gives it `xl`, and
 * there the control stops at `lg`.
 *
 * The radius is the same as `py` at each step. The padding-to-radius ratio is
 * thus 1:1 across the controls with no ControlFrame (listbox, combobox,
 * date-picker button). For a ControlFrame consumer (input, textarea, select
 * trigger), `kata/control.ts` gives `frameRadius`, which starts with `radius`,
 * to the frame. The gap is half of `py` at each step, rounded to the spacing
 * scale. The text size is `textRamp`, the text ramp of each density-native
 * component.
 *
 * The axis also carries the affix autofill margins (`affix.autofill`, see
 * `./affix.ts`). They are `group-has` gated `autofill:` margins that inset the
 * autofill highlight of the browser from an adjacent affix slot by `px`. They
 * are on this axis, so each control input gets them with no wiring in its
 * kata. The gate keeps them dormant in a frame with no slot.
 *
 * Layer: kiso · Archetype: control · Concern: density
 */

import { textRamp } from '../ji'
import { affix } from './affix'

/** The radius at each step. `kata/control.ts` also gives it to ControlFrame. */
export const radius = 'density-rounded-[1.5,2,2.5]'

/** The vertical padding at each step. The textarea skeleton also reads it. */
export const py = 'density-py-ring-[1.5,2,2.5]'

export const density = [
	'density-px-ring-[2.5,3,3.5]',
	py,
	radius,
	'density-gap-[0.75,1,1.25]',
	affix.autofill.prefix,
	affix.autofill.suffix,
	textRamp,
] as const
