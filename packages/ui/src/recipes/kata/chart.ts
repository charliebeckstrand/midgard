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
import { hannou, iro, kasane, kokkaku, sen } from '../kiso'

const { cursor, tint } = hannou

const { text } = iro

const { rounded } = kasane

const { focus } = sen

/**
 * Per-colour mark classes: `stroke` for lines and markers, `fill` for bars,
 * areas, slices, and SVG text, `bg` for HTML swatches (legend keys, tooltip
 * rows), and `onFill` for label text set inside the mark's own fill — the one
 * place text sits on a series colour. `onFill` is white-first: the semibold
 * label reads white on every slot except the yellow-family fills (green,
 * amber), where white drops below a ~3.5:1 semibold floor and the label takes
 * near-black ink instead; the de-emphasis `zinc` takes ink on its light dark
 * step. The eight slot hues carry the categorical palette; `zinc` sits
 * outside the slot order as the de-emphasis colour for context series.
 */
const series = {
	blue: {
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
		bg: mode('bg-blue-600', 'dark:bg-blue-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	orange: {
		stroke: mode('stroke-orange-600', 'dark:stroke-orange-600'),
		fill: mode('fill-orange-600', 'dark:fill-orange-600'),
		bg: mode('bg-orange-600', 'dark:bg-orange-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	violet: {
		stroke: mode('stroke-violet-600', 'dark:stroke-violet-500'),
		fill: mode('fill-violet-600', 'dark:fill-violet-500'),
		bg: mode('bg-violet-600', 'dark:bg-violet-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	green: {
		stroke: mode('stroke-green-600', 'dark:stroke-green-600'),
		fill: mode('fill-green-600', 'dark:fill-green-600'),
		bg: mode('bg-green-600', 'dark:bg-green-600'),
		onFill: mode('fill-zinc-950', 'dark:fill-zinc-950'),
	},
	red: {
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
		fill: mode('fill-red-600', 'dark:fill-red-500'),
		bg: mode('bg-red-600', 'dark:bg-red-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	sky: {
		stroke: mode('stroke-sky-600', 'dark:stroke-sky-600'),
		fill: mode('fill-sky-600', 'dark:fill-sky-600'),
		bg: mode('bg-sky-600', 'dark:bg-sky-600'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	amber: {
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-600'),
		fill: mode('fill-amber-600', 'dark:fill-amber-600'),
		bg: mode('bg-amber-600', 'dark:bg-amber-600'),
		onFill: mode('fill-zinc-950', 'dark:fill-zinc-950'),
	},
	rose: {
		stroke: mode('stroke-rose-600', 'dark:stroke-rose-500'),
		fill: mode('fill-rose-600', 'dark:fill-rose-500'),
		bg: mode('bg-rose-600', 'dark:bg-rose-500'),
		onFill: mode('fill-white', 'dark:fill-white'),
	},
	zinc: {
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
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
	/** Point-marker ring: white in both modes, so a dot stays legible crossing any line or fill. */
	pointRing: mode('stroke-white', 'dark:stroke-white'),
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ['text-xs', ...text.muted],
	/** An interactive legend entry: pointer cursor, ghost hover/focus wash, keyboard focus ring. */
	legendItem: [
		'flex',
		'items-center',
		'gap-1.5',
		'px-1.5',
		'py-0.5',
		rounded.md,
		...cursor,
		...tint,
		...focus.ring,
	],
	/** Tooltip value ink: the strong element, values lead. */
	value: ['text-xs', 'font-medium', 'tabular-nums', ...text.default],
	skeleton: kokkaku.chart,
} as const
