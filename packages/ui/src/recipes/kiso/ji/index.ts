/**
 * Ji (字) — typography. Size scale (label → text class) spread at the
 * top level for the dominant use case, plus `weight`, `leading`, and
 * `family` aliases. One file per concern; this barrel assembles the
 * named bundle that every kata reads.
 */

import { family } from './family'
import { leading } from './leading'
import { size } from './size'
import { weight } from './weight'

export const ji = {
	...size,
	size,
	weight,
	leading,
	family,
} as const

export type Ji = keyof typeof size
