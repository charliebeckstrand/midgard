/**
 * Omote bg: the color pairs (`light`/`dark`) every surface concern
 * composes with its chrome. One source of truth for surface / popover /
 * tint / skeleton fills. Backdrop fills live with the backdrop chrome
 * in `backdrop.ts`.
 *
 * Layer: kiso · Concern: surface fills
 */

import { mode } from '../../../core/recipe'

export const bg = {
	/**
	 * The opaque surface fill. It also sets `--surface-fill` to the same color in
	 * each mode. The property inherits, so a sticky descendant (a grid header or a
	 * frozen column) reads the fill of the surface that holds it.
	 */
	surface: mode(
		['bg-white', '[--surface-fill:var(--color-white)]'],
		['dark:bg-zinc-900', 'dark:[--surface-fill:var(--color-zinc-900)]'],
	),
	popover: mode('bg-white/90', 'dark:bg-zinc-800/75'),
	tint: mode('bg-zinc-950/5', 'dark:bg-white/10'),
	skeleton: {
		/** The tone of a loading skeleton. */
		base: mode('bg-zinc-200', 'dark:bg-zinc-700'),
		/** The same tone as an SVG fill, for a skeleton drawn as a shape. */
		fill: mode('fill-zinc-200', 'dark:fill-zinc-700'),
	},
	/**
	 * The code-block canvas. It is the background of the Shiki theme of the block,
	 * which the block writes to `--code-canvas`. With no value there, it is
	 * `#0d1117`, the background of the default theme `github-dark-default`. It
	 * does not change with the color mode.
	 */
	code: 'bg-[var(--code-canvas,#0d1117)]',
} as const
