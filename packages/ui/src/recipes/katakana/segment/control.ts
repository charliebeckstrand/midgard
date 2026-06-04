/**
 * Segment archetype — outer control. The rounded-box chrome that hosts the
 * segment items and the sliding indicator. The size axis sets the padding
 * and the gap between items.
 *
 * Layer: katakana · Archetype: segment · Concern: control
 */

import { kasane } from '../../kiso/kasane'
import { narabi } from '../../kiso/narabi'
import { omote } from '../../kiso/omote'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote

export const control = {
	base: [flex.inline, ...bg.tint, rounded.lg],
	size: {
		sm: 'p-0.5 gap-1',
		md: 'p-1 gap-2',
		lg: 'p-1 gap-3',
	},
} as const
