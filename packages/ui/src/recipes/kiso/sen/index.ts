/**
 * Sen (線) — lines. Borders, rings, dividers, focus indicators, and
 * forced-colors safety nets — how an element draws its edges. One file
 * per concern; this barrel assembles the named bundle that every kata
 * reads.
 */

import {
	border,
	borderColor,
	borderEmphasis,
	borderSubtle,
	borderSubtleColor,
	borderTransparent,
} from './border'
import { divider } from './divider'
import { focus } from './focus'
import { forced } from './forced'
import { outline, outlineStrong, outlineSubtle } from './outline'
import { ring, ringInset } from './ring'

export const sen = {
	border,
	borderColor,
	borderEmphasis,
	borderSubtle,
	borderSubtleColor,
	borderTransparent,
	outline,
	outlineStrong,
	outlineSubtle,
	ring,
	ringInset,
	divider,
	focus,
	forced,
} as const
