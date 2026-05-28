/**
 * Omote (面) — surfaces. Named surface fills and generic chromes that
 * apply across the design system. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { backdrop } from './backdrop'
import { bg } from './bg'
import { blur } from './blur'
import { content } from './content'
import { glass } from './glass'
import { popover } from './popover'
import { skeleton } from './skeleton'
import { surface } from './surface'
import { tint } from './tint'

export const omote = {
	bg,
	surface,
	popover,
	glass,
	backdrop,
	content,
	tint,
	skeleton,
	blur,
} as const
