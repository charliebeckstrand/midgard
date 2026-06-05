/**
 * Segment archetype — outer control. The rounded-box chrome that hosts the
 * segment items and the sliding indicator. The size axis sets the padding
 * and the gap between items.
 *
 * Layer: kiso · Archetype: segment · Concern: control
 */

import { ji } from '../ji'
import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { omote } from '../omote'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { size } = ji

export const control = {
	// `self-start` keeps the control hugging its content: it renders inside the
	// `flex flex-col` tab-group, whose default `align-items: stretch` would
	// otherwise pull this inline-flex box to full width along the cross axis.
	base: [flex.inline, 'self-start', ...bg.tint, rounded.lg],
	size: {
		sm: ['p-1 gap-1', size.sm],
		md: ['p-1 gap-2', size.md],
		lg: ['p-1 gap-3', size.lg],
	},
} as const
