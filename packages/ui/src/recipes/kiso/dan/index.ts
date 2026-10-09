/**
 * Dan (段): the density ramps. A ramp is a stepped `density-*` class with a
 * value for each step, such as `density-p-[1,2,3,4,5]`. It is the one place that
 * writes those values. A kata, a skeleton dimension, and another kiso token
 * read the ramp from here, and `defineScale` reads the steps of a size scale
 * from it. `size-scale-boundary.test.ts` holds each ramp of the package here.
 *
 * A ramp with a variant, such as `*:data-[slot=icon]:density-size-[…]`, lives
 * here too, because Tailwind reads each class from its literal source.
 *
 * Layer: kiso · Concern: density ramps
 */

import { gap } from './gap'
import { radius } from './radius'
import { size } from './size'
import { space } from './space'
import { text } from './text'

export const dan = {
	text,
	space,
	gap,
	radius,
	size,
} as const
