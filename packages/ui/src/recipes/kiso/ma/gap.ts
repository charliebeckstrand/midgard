/**
 * Ma gap: the named gap scale, the single source of truth for bidirectional
 * gap. `Flex` reaches it through `recipes/kata/flex`, and `Split` reaches it
 * through Flex's own responsive gap resolver. Each stop but `0` is a ramp of
 * `dan.gap.scale`, so the gap takes the step of the nearest density scope.
 *
 * Layer: kiso · Concern: gap utilities
 */

import { dan } from '../dan'
import type { Ma } from './scale'

export const gap = {
	0: 'gap-0',
	...dan.gap.scale,
} as const satisfies Record<Ma, string>
