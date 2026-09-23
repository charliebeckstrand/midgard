/**
 * Chart kata: object-literal surface for every chart in the chart module. The
 * series palette, the shared inks, and the reveal motion come from the kiso
 * `zu` bundle, which the map kata reads too. This surface adds the chart's own
 * chrome: the axis title, the tick labels, the marker stroke, the focus ring,
 * and the spark posture.
 */
import { mode } from '../../core/recipe'
import { iro, kokkaku, type SeriesSlot, sen, zu } from '../kiso'

const { text } = iro

const { palette, ink, motion } = zu

/** A named chart colour slot: the eight categorical slots plus `zinc`. */
export type ChartColorSlot = SeriesSlot

export const k = {
	/** The categorical series palette, from `zu` (see its CVD validation notes). */
	series: palette.series,
	/** The fixed categorical slot order; a series keeps its slot when siblings toggle. */
	order: palette.order,
	/** Hairline gridlines, one step off the surface. */
	grid: ink.grid,
	/** The axis baseline (`line`) and its value-axis title (`title`). */
	axis: {
		/** The axis baseline, a step firmer than the grid. */
		line: ink.axis.line,
		/** SVG value-axis title ink: a step smaller and firmer than the ticks it names. */
		title: ['text-xs', 'font-medium', ...mode('fill-zinc-500', 'dark:fill-zinc-400')],
	},
	/** SVG tick-label ink: muted, tabular for vertical alignment. */
	tick: ['text-sm', 'tabular-nums', ...mode('fill-zinc-500', 'dark:fill-zinc-400')],
	/** Point-marker stroke: white in both modes, so a dot stays legible crossing the opaque marks behind it. */
	stroke: mode('stroke-white', 'dark:stroke-white'),
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ink.label,
	/** Tooltip value ink: the strong element, values lead. */
	value: ink.value,
	/** The keyboard focus ring on the plot region when arrow-key navigation is enabled, and on the range legend's scale-bar slider. */
	focusRing: sen.focus.ring,
	/** The range legend's hover arrow: foreground ink (via `currentColor`), so the class glyph reads over the panel. */
	arrow: text.default,
	/**
	 * The drawing SVG's pointer posture at the resolved tier: at spark the whole
	 * drawing goes inert. A sparkline is read-only, so no mark hover styling,
	 * cursor, or hit target can engage. The descendant rule is the load-bearing
	 * half. The hit layers re-enable themselves through `pointerEvents="all"` /
	 * `"stroke"` presentation attributes. Those attributes win over an inherited
	 * `pointer-events: none`, but lose to any author CSS rule. Wider tiers add
	 * nothing.
	 */
	drawing: (spark: boolean) => (spark ? ['pointer-events-none', '**:pointer-events-none'] : []),
	/** Motion vocabulary for the mount reveals, from `zu`. `chart-motion.ts` composes the chart's timings from it. */
	motion,
	skeleton: kokkaku.chart,
} as const
