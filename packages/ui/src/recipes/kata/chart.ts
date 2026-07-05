/**
 * Chart kata: object-literal surface for the chart module (Bar / Line / Pie /
 * Combo). Carries the categorical series palette — eight fixed slots plus the
 * `zinc` de-emphasis colour — with the chart chrome inks (gridlines, axis
 * baseline, tick labels, legend/tooltip text) and the tooltip surface, so
 * every chart kind reads one colour system.
 *
 * Slot shades track `kata/progress` and `kata/sparkline` (600 light / 500
 * dark, per-hue dark steps where the 500 leaves the dark lightness band) so
 * the data-viz family reads as one. The slot *order* is the colourblind-safety
 * mechanism, not cosmetic: it was derived by exhaustively scoring orderings on
 * the minimum adjacent-pair Machado CVD ΔE (protan / deutan / tritan, CIE76)
 * in both modes — blue anchored first, warm reds held out of the leading four
 * slots — and validated with the six-checks palette validator: light on
 * `#ffffff` worst adjacent ΔE 21.7 (tritan 32.5), dark on zinc-900 worst 15.8
 * (tritan 25.1), every slot inside the OKLCH lightness band, over the chroma
 * floor, and ≥ 3:1 contrast on its surface. Re-run the validator before
 * reordering or re-shading.
 */
import { mode } from '../../core/recipe'
import { iro, kokkaku, sen } from '../kiso'

const { text } = iro

/**
 * Per-colour mark classes: `stroke` for lines and markers, `fill` for bars,
 * areas, slices, and SVG text, `text` (a currentColor class) for HTML swatches
 * (legend keys, tooltip rows — `<Swatch>` fills from it), and `onFill` for
 * label text set inside the mark's own fill — the one place text sits on a
 * series colour. `onFill` is white-first: the percent label is a redundant
 * graphical annotation — the tooltip and hidden data table carry the
 * authoritative value — so it clears the non-text 3:1 floor (WCAG 1.4.11)
 * rather than the 4.5:1 text floor, which the luminance formula overstates on
 * saturated mid-tone fills. Every categorical slot reads `white` in both modes;
 * only the de-emphasis `zinc` drops to near-black `zinc-950`, on its light
 * `zinc-400` dark step where white falls under 3:1. The
 * `__tests__/recipes/chart-label-contrast` guard re-derives each pick from
 * Tailwind's theme with the `readableInk` utility and fails on drift. The eight
 * slot hues carry the categorical palette; `zinc` sits outside the slot order
 * as the de-emphasis colour for context series.
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

/** A named chart mark colour: the eight categorical slots plus `zinc`. */
export type ChartSeriesColor = keyof typeof series

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
] as const satisfies readonly ChartSeriesColor[]

export const k = {
	series,
	order,
	/** Hairline gridlines, one step off the surface. */
	grid: mode('stroke-zinc-200', 'dark:stroke-zinc-800'),
	/** The axis baseline, a step firmer than the grid. */
	axis: mode('stroke-zinc-300', 'dark:stroke-zinc-700'),
	/** SVG tick-label ink: muted, tabular for vertical alignment. */
	tick: ['text-xs', 'tabular-nums', ...mode('fill-zinc-500', 'dark:fill-zinc-400')],
	/** Point-marker stroke: white in both modes, so a dot stays legible crossing the opaque marks behind it. */
	stroke: mode('stroke-white', 'dark:stroke-white'),
	/** Keyboard-focus ring for the plot region — the library's standard accent outline. */
	focus: sen.focus.ring,
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ['text-sm text-left', 'leading-tight', ...text.muted],
	/** Tooltip value ink: the strong element, values lead. */
	value: ['text-xs', 'font-medium', 'tabular-nums', ...text.default],
	skeleton: kokkaku.chart,
} as const
