/**
 * Control archetype: density axis. Padding, radius, child gap, and text size.
 *
 * Each class is a stepped `density-*` utility. The control takes the step of
 * its nearest density scope, and a control with an explicit `size` writes that
 * scope on its own frame. So the classes are the same at each step, and the
 * control reads no context. Each class has five values, so the size scale of a
 * control is `xs` to `xl` (`scale`). Its height is the line height of the text
 * plus twice `py`, the height of a button at the same step
 * (`core/density/geometry.ts`).
 *
 * The radius is the same stop as `py` at each step. The padding-to-radius
 * ratio is thus 1:1 across the controls with no ControlFrame (listbox, combobox,
 * date-picker button). For a ControlFrame consumer (input, textarea, select
 * trigger), `kata/control.ts` gives `frameRadius`, which starts with `radius`,
 * to the frame. The gap is half of `py` at each step, rounded to the spacing
 * scale. The text size is `ji.ramp`, the text ramp of each density-native
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

import { defineScale } from '../../../core/density'
import { dan } from '../dan'
import { ji } from '../ji'
import { affix } from './affix'

/** The radius at each step. `kata/control.ts` also gives it to ControlFrame. */
export const radius = dan.radius.control

/** The vertical padding at each step. */
export const py = dan.space.control.y

export const density = [
	dan.space.control.x,
	py,
	radius,
	dan.gap.control,
	affix.autofill.prefix,
	affix.autofill.suffix,
	ji.ramp,
] as const

/** The size scale of a control: the steps of its padding, radius, gap, and text. */
export const scale = defineScale(dan.space.control.x, py, radius, dan.gap.control, ji.ramp)
