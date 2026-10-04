/**
 * Shaku (尺): measure. Dimension scales: width, height, and the
 * icon-slot size grid. Typography lives in `ji`; padding, margin, and
 * gap live in `ma`. One file per concern; this barrel assembles the
 * named bundle that every kata reads.
 */

import { icon } from './icon'
import { mark } from './mark'
import { panel } from './panel'
import { scrollArea } from './scroll-area'

export const shaku = {
	icon,
	panel,
	scrollArea,
	mark,
} as const
