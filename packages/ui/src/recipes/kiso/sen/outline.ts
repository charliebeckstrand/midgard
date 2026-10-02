/**
 * Sen outline: `outline-style` 1 px lines in the three library
 * intensities. Used where a ring would conflict with `kasane.layers.base`
 * (panel chrome).
 *
 * The line sits on the inner edge of the box, over its background. A
 * translucent tone then adds to the background below it, so the edge shows
 * on a tint of the same alpha. Outside the box, the line has the same color
 * as that tint and no edge shows.
 *
 * Layer: kiso · Concern: outlines
 */

import { tone } from './tone'

const inset = '-outline-offset-1'

export const outline = {
	/** Default outline: 1 px line, low-contrast palette. */
	default: ['outline', inset, ...tone.outline],
	/** Stronger outline: emphasis on dark backgrounds. */
	strong: ['outline', inset, ...tone.outlineStrong],
	/** Subtle outline: secondary separators. */
	subtle: ['outline', inset, ...tone.outlineSubtle],
} as const
