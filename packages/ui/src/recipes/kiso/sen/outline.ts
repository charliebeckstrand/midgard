/**
 * Sen outline — `outline-style` 1px lines in the three library
 * intensities. Used where a ring would conflict with `kasane.base` or
 * where the line needs to live outside the element's box (focus
 * indicators, panel chrome).
 *
 * Layer: kiso · Concern: outlines
 */

import { tone } from './tone'

/** Default outline — 1 px outline-style line. */
export const outline = ['outline', ...tone.outline]
/** Stronger outline — for emphasis on dark backgrounds. */
export const outlineStrong = ['outline', ...tone.outlineStrong]
/** Subtle outline — secondary separators. */
export const outlineSubtle = ['outline', ...tone.outlineSubtle]
