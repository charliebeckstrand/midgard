/**
 * Ji (字): typography. Four named axes (`size`, `weight`, `leading`,
 * `family`), each addressable as `ji.<axis>.<key>`. One file per concern;
 * this barrel assembles the named bundle that every kata reads.
 */

import { family } from './family'
import { leading } from './leading'
import { size } from './size'
import { weight } from './weight'

export const ji = {
	size,
	weight,
	leading,
	family,
} as const
