/**
 * Ma gap: the named gap scale (xs/sm/md/lg/xl), the single source of truth
 * for bidirectional gap. `Flex` reaches it through `recipes/kata/flex`, which
 * adds the `gap-0` reset step.
 *
 * Layer: kiso · Concern: gap utilities
 */

import type { Ma } from './stops'

export const gap = {
	xs: 'gap-1',
	sm: 'gap-2',
	md: 'gap-3',
	lg: 'gap-4',
	xl: 'gap-6',
} as const satisfies Record<Ma, string>
