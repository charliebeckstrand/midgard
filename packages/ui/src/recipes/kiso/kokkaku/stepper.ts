/**
 * Kokkaku skeleton: stepper. Per-step indicator dot and title line for
 * the horizontal orientation; step count comes from the composing
 * skeleton. Title height matches the leading-none text-sm line.
 *
 * Layer: kiso · Concern: skeleton form · Unit: stepper
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const stepper = {
	step: 'flex w-32 shrink-0 flex-col items-center',
	indicator: [rounded.full, 'size-3.5'],
	title: 'mt-2 h-3.5 w-20',
} as const
