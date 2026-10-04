/**
 * Ji (字): typography. Four named axes (`size`, `weight`, `leading`,
 * `family`), each addressable as `ji.<axis>.<key>`, and `ramp`, the stepped
 * text size of a density-native component. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { family } from './family'
import { leading } from './leading'
import { ramp, size } from './size'
import { weight } from './weight'

export const ji = {
	size,
	weight,
	leading,
	family,
	ramp,
} as const
