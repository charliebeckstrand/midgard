/**
 * Zu palette: the categorical series palette every data-viz module reads, eight
 * fixed slots plus the `zinc` de-emphasis color. The chart and map kata both
 * take it from here, so the CVD-validated slot order cannot fork.
 *
 * Slot shades track `kata/progress` and `kata/sparkline` (600 light / 500
 * dark, per-hue dark steps where the 500 leaves the dark lightness band). The
 * data-viz family thus reads as one. The slot *order* is the
 * colorblind-safety mechanism, not cosmetic. It was derived by exhaustively
 * scoring orderings on the minimum adjacent-pair Machado CVD ΔE (protan /
 * deutan / tritan, CIE76) in both modes. Blue is anchored first, and warm reds
 * are held out of the leading four slots. The six-checks palette validator then
 * confirmed it:
 *
 * - Light on `#ffffff`: worst adjacent ΔE 21.7 (tritan 32.5).
 * - Dark on zinc-900: worst 15.8 (tritan 25.1).
 * - Every slot inside the OKLCH lightness band.
 * - Every slot over the chroma floor.
 * - Every slot at ≥ 3:1 contrast on its surface.
 *
 * Re-run the validator before reordering or re-shading.
 *
 * Layer: kiso · Archetype: zu · Concern: palette
 */

import { mode } from '../../../core/recipe'

/**
 * Per-color mark classes:
 *
 * - `stroke` for lines and markers.
 * - `fill` for bars, areas, slices, and SVG text.
 * - `text` (a currentColor class) for HTML swatches (legend keys, tooltip rows
 *   — `<Swatch>` fills from it).
 * - `onFill` for label text set inside the mark's own fill, the one place text
 *   sits on a series color.
 *
 * `onFill` is white-first. The percent label is a redundant graphical
 * annotation, since the tooltip and hidden data table carry the authoritative
 * value. It therefore clears the non-text 3:1 floor (WCAG 1.4.11) rather than
 * the 4.5:1 text floor. The luminance formula overstates that floor on
 * saturated mid-tone fills. Every categorical slot reads `white` in both modes.
 * Only the de-emphasis `zinc` drops to near-black `zinc-950`, on its light
 * `zinc-400` dark step where white falls under 3:1. The
 * `__tests__/recipes/chart-label-contrast` guard re-derives each pick from
 * Tailwind's theme with the `readableInk` utility and fails on drift. The eight
 * slot hues carry the categorical palette; `zinc` sits outside the slot order
 * as the de-emphasis color for context series.
 */
const series = {
	blue: {
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
		text: mode('text-blue-600', 'dark:text-blue-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	orange: {
		stroke: mode('stroke-orange-600', 'dark:stroke-orange-600'),
		fill: mode('fill-orange-600', 'dark:fill-orange-600'),
		text: mode('text-orange-600', 'dark:text-orange-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	violet: {
		stroke: mode('stroke-violet-600', 'dark:stroke-violet-500'),
		fill: mode('fill-violet-600', 'dark:fill-violet-500'),
		text: mode('text-violet-600', 'dark:text-violet-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	green: {
		stroke: mode('stroke-green-600', 'dark:stroke-green-600'),
		fill: mode('fill-green-600', 'dark:fill-green-600'),
		text: mode('text-green-600', 'dark:text-green-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	red: {
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
		fill: mode('fill-red-600', 'dark:fill-red-500'),
		text: mode('text-red-600', 'dark:text-red-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	sky: {
		stroke: mode('stroke-sky-600', 'dark:stroke-sky-600'),
		fill: mode('fill-sky-600', 'dark:fill-sky-600'),
		text: mode('text-sky-600', 'dark:text-sky-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	amber: {
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-600'),
		fill: mode('fill-amber-600', 'dark:fill-amber-600'),
		text: mode('text-amber-600', 'dark:text-amber-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	rose: {
		stroke: mode('stroke-rose-600', 'dark:stroke-rose-500'),
		fill: mode('fill-rose-600', 'dark:fill-rose-500'),
		text: mode('text-rose-600', 'dark:text-rose-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	zinc: {
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
		text: mode('text-zinc-600', 'dark:text-zinc-400'),
		onFill: mode('fill-white', 'dark:fill-zinc-950'),
	},
}

/** A named data-viz color slot: the eight categorical slots plus `zinc`. */
export type SeriesSlot = keyof typeof series

/** The fixed categorical slot order; a series keeps its slot when siblings toggle. */
const order = [
	'blue',
	'orange',
	'violet',
	'green',
	'red',
	'sky',
	'amber',
	'rose',
] as const satisfies readonly SeriesSlot[]

export const palette = { series, order } as const
