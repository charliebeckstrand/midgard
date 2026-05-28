/**
 * Sen outline — `outline-style` 1 px lines in the three library
 * intensities. Used where a ring would conflict with `kasane.base` or
 * where the line needs to live outside the element's box (focus
 * indicators, panel chrome).
 *
 * Layer: kiso · Concern: outlines
 */

import { tone } from './tone'

export const outline = {
	/** Default outline — 1 px line, low-contrast palette. */
	default: ['outline', ...tone.outline],
	/** Stronger outline — emphasis on dark backgrounds. */
	strong: ['outline', ...tone.outlineStrong],
	/** Subtle outline — secondary separators. */
	subtle: ['outline', ...tone.outlineSubtle],
} as const
