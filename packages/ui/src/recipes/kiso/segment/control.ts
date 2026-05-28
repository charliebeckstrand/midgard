/**
 * Segment archetype — outer control. The rounded-box chrome that hosts the
 * segment items and the sliding indicator. The size axis sets the padding
 * and the gap between items.
 *
 * Layer: kiso · Archetype: segment · Concern: control
 */

import { omote } from '../omote'

export const control = {
	base: ['inline-flex items-center', 'rounded-lg', ...omote.tint],
	size: {
		sm: 'p-0.5 gap-1',
		md: 'p-1 gap-2',
		lg: 'p-1 gap-3',
	},
}
