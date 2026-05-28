/**
 * Sen (線) — lines. Borders, rings, dividers, focus indicators, and
 * forced-colors safety nets — how an element draws its edges. One file
 * per concern; this barrel assembles the named bundle that every kata
 * reads.
 */

import { border } from './border'
import { divider } from './divider'
import { focus } from './focus'
import { forced } from './forced'
import { outline } from './outline'
import { ring } from './ring'

export const sen = {
	border,
	outline,
	ring,
	divider,
	focus,
	forced,
} as const
