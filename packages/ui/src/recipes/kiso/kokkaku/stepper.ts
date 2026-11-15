/**
 * Kokkaku skeleton: stepper. The indicator dot and the title line of each
 * step. The step count comes from the composing skeleton, and the layout of
 * each orientation comes from the real stepper recipes. The title height
 * matches the `leading-none` line of `sm` text.
 *
 * Layer: kiso · Concern: skeleton form · Unit: stepper
 */

import { ji } from '../ji'
import { kasane } from '../kasane'

const { size } = ji
const { rounded } = kasane

export const stepper = {
	indicator: [rounded.full, 'size-4.5 shrink-0'],
	title: [size.sm, 'leading-none', 'h-lh w-20'].join(' '),
} as const
