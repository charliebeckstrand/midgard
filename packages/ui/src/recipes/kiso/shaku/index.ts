/**
 * Shaku (尺): measure. The icon scale, the max-width steps of a panel, and the
 * mark of an inline code or key. Typography lives in `ji`; padding, margin,
 * gap, and the size ramps live in `dan`. One file per concern; this barrel assembles the
 * named bundle that every kata reads.
 */

import { icon } from './icon'
import { mark } from './mark'
import { panel } from './panel'

export const shaku = {
	icon,
	panel,
	mark,
} as const
