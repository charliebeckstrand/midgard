/**
 * Ma gap: the named gap scale, the single source of truth for bidirectional
 * gap. `Flex`, `Split`, and `Columns` read it through their units. Each stop
 * but `0` is a ramp of `dan.gap.scale`, so the gap takes the step of the
 * nearest density scope. The `0` stop is `dan.gap.none`, a stepped rule with
 * no gap. Each stop is then in the `density` layer, so a breakpoint replaces
 * the gap of a smaller one.
 *
 * Layer: kiso · Concern: gap utilities
 */

import { dan } from '../dan'
import type { Ma } from './scale'

export const gap = {
	0: dan.gap.none,
	...dan.gap.scale,
} as const satisfies Record<Ma, string>
