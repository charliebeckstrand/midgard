/**
 * Sen outline: `outline-style` 1 px lines in the three library
 * intensities. Used where a ring would conflict with the base ring of
 * `kasane.layers` (panel chrome).
 *
 * The line sits on the inner edge of the box, over its background. A
 * translucent tone then adds to the background below it, so the edge shows
 * on a tint of the same alpha. Outside the box, the line has the same color
 * as that tint and no edge shows.
 *
 * Layer: kiso · Concern: outlines
 */

import { mode } from '../../../core/recipe'

import { contrastMore } from './tone'

const { light, dark } = contrastMore.outline

const inset = '-outline-offset-1'

/** The width and the color of each outline, in each mode. */
const color = {
	default: mode(
		['outline-1 outline-zinc-950/10', light],
		['dark:outline-1 dark:outline-white/10', dark],
	),
	strong: mode(
		['outline-1 outline-zinc-950/15', light],
		['dark:outline-1 dark:outline-white/15', dark],
	),
	subtle: mode(
		['outline-1 outline-zinc-950/5', light],
		['dark:outline-1 dark:outline-white/5', dark],
	),
}

export const outline = {
	/** Default outline: 1 px line, low-contrast palette. */
	default: ['outline', inset, ...color.default],
	/** Stronger outline: emphasis on dark backgrounds. */
	strong: ['outline', inset, ...color.strong],
	/** Subtle outline: secondary separators. */
	subtle: ['outline', inset, ...color.subtle],
} as const
