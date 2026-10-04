/**
 * Kokkaku skeleton: accordion. One label line and one indicator square per
 * collapsed item header. The item count comes from the composing skeleton.
 *
 * The label has the line height of the `md` text of the header. The
 * indicator takes `shaku.icon.base`, as the chevron Icon of a real header
 * does. The padding and the gap come from the box of the real header. The
 * label width is a default, and the line does not go wider than the header.
 *
 * Layer: kiso · Concern: skeleton form · Unit: accordion
 */

import { shaku } from '../shaku'

export const accordion = {
	label: 'h-6 w-40 max-w-full',
	indicator: ['shrink-0', shaku.icon.base],
} as const
