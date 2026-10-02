/**
 * Kokkaku skeleton: stepper. The indicator dot and the title line of each
 * step. The step count comes from the composing skeleton, and the layout of
 * each orientation comes from the real stepper recipes. The title height
 * matches the `leading-none` line of `sm` text.
 *
 * Layer: kiso · Concern: skeleton form · Unit: stepper
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const stepper = {
	indicator: [rounded.full, 'size-3.5 shrink-0'],
	title: 'h-3.5 w-20',
} as const
