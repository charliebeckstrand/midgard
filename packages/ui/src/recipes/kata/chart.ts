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
import { iro, kasane, kokkaku } from '../kiso'

const { text } = iro

const { rounded } = kasane

/**
 * Per-colour mark classes: `stroke` for lines and markers, `fill` for bars,
 * areas, slices, and SVG text, `bg` for HTML swatches (legend keys, tooltip
 * rows). The eight slot hues carry the categorical palette; `zinc` sits
 * outside the slot order as the de-emphasis colour for context series.
 */
const series = {
	blue: {
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
		bg: mode('bg-blue-600', 'dark:bg-blue-500'),
	},
	orange: {
		stroke: mode('stroke-orange-600', 'dark:stroke-orange-600'),
		fill: mode('fill-orange-600', 'dark:fill-orange-600'),
		bg: mode('bg-orange-600', 'dark:bg-orange-600'),
	},
	violet: {
		stroke: mode('stroke-violet-600', 'dark:stroke-violet-500'),
		fill: mode('fill-violet-600', 'dark:fill-violet-500'),
		bg: mode('bg-violet-600', 'dark:bg-violet-500'),
	},
	green: {
		stroke: mode('stroke-green-600', 'dark:stroke-green-600'),
		fill: mode('fill-green-600', 'dark:fill-green-600'),
		bg: mode('bg-green-600', 'dark:bg-green-600'),
	},
	red: {
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
		fill: mode('fill-red-600', 'dark:fill-red-500'),
		bg: mode('bg-red-600', 'dark:bg-red-500'),
	},
	sky: {
		stroke: mode('stroke-sky-600', 'dark:stroke-sky-600'),
		fill: mode('fill-sky-600', 'dark:fill-sky-600'),
		bg: mode('bg-sky-600', 'dark:bg-sky-600'),
	},
	amber: {
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-600'),
		fill: mode('fill-amber-600', 'dark:fill-amber-600'),
		bg: mode('bg-amber-600', 'dark:bg-amber-600'),
	},
	rose: {
		stroke: mode('stroke-rose-600', 'dark:stroke-rose-500'),
		fill: mode('fill-rose-600', 'dark:fill-rose-500'),
		bg: mode('bg-rose-600', 'dark:bg-rose-500'),
	},
	zinc: {
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
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
	/** Surface-colour separators: the pie-slice gap stroke and marker rings. */
	gap: mode('stroke-white', 'dark:stroke-zinc-900'),
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ['text-xs', ...text.muted],
	/** Tooltip value ink: the strong element, values lead. */
	value: ['text-xs', 'font-medium', 'tabular-nums', ...text.default],
	/** The tooltip's floating surface. */
	tooltip: [
		rounded.md,
		'shadow-md',
		'ring-1',
		...mode('bg-white', 'dark:bg-zinc-800'),
		...mode('ring-zinc-950/10', 'dark:ring-white/10'),
	],
	skeleton: kokkaku.chart,
} as const
