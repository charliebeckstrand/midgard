/**
 * Ma gap: the named gap scale, the single source of truth for bidirectional
 * gap. `Flex` reaches it through `recipes/kata/flex`, and `Split` reaches it
 * through Flex's own responsive gap resolver.
 *
 * Layer: kiso · Concern: gap utilities
 */

import type { Ma } from './scale'

export const gap = {
	0: 'gap-0',
	xs: 'gap-1',
	sm: 'gap-2',
	md: 'gap-3',
	lg: 'gap-4',
	xl: 'gap-6',
} as const satisfies Record<Ma, string>
