/**
 * Sen ring: the box-shadow rings of the library. A kata takes a ring from here
 * and does not write a ring width itself (CONVENTIONS §5.10).
 *
 * A ring is a box-shadow, which forced colors remove, so each ring carries an
 * outline of the same width and position. The outline keeps the edge under
 * forced colors.
 *
 *   - `default`, `inset`: the 1 px ring in the default tone. The inset ring is
 *     the one composers reach for inside translucent containers (popover,
 *     panel), where an outset ring would crop against the surface chrome.
 *   - `line`: the ring of each width with no color, for a kata that sets its own
 *     color. `line[1].inset` is the 1 px inset ring. An outset ring is for a
 *     mark on content, such as a selected PDF region, where an inset ring would
 *     cover the content.
 *
 * Layer: kiso · Concern: rings
 */

import { mode } from '../../../core/recipe'

import { forced } from './forced'
import { contrastMore } from './tone'

/** The ring color: low contrast. */
const color = mode(
	['ring-zinc-950/10', contrastMore.ring.light],
	['dark:ring-white/10', contrastMore.ring.dark],
)

/** The ring of each width and position, each with its forced-colors outline. */
const line = {
	1: {
		outset: ['ring-1', forced.outline],
		inset: ['ring-1 ring-inset', forced.outline, 'forced-colors:-outline-offset-1'],
	},
	2: {
		outset: ['ring-2', forced.outline, 'forced-colors:outline-2'],
		inset: [
			'ring-2 ring-inset',
			forced.outline,
			'forced-colors:outline-2 forced-colors:-outline-offset-2',
		],
	},
} as const

export const ring = {
	/** Default ring: 1 px line, low-contrast palette, and an outline under forced colors. */
	default: [...line[1].outset, ...color],
	/** Inset ring: sits inside the element, subtle in light / stronger in dark. */
	inset: [...line[1].inset, ...color],
	line,
} as const
