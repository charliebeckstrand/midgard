/**
 * Sen ring: `ring-1` and `ring-1 ring-inset` in the default tone. The
 * inset variant is the one composers reach for inside translucent
 * containers (popover, panel) where an outset ring would visually
 * crop against the surface chrome.
 *
 * Layer: kiso · Concern: rings
 */

import { tone } from './tone'

export const ring = {
	/** Default ring: 1 px line, low-contrast palette. */
	default: ['ring-1', ...tone.ring],
	/** Inset ring: sits inside the element, subtle in light / stronger in dark. */
	inset: ['ring-1', ...tone.ring, 'ring-inset'],
} as const
