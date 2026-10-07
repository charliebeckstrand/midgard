/**
 * Chart kata: object-literal surface for every chart in the chart module. The
 * series palette, the shared inks, and the reveal motion come from the kiso
 * `zu` bundle, which the map kata reads too. This surface adds the chart's own
 * chrome: the axis title, the tick labels, the marker stroke, the focus ring,
 * and the spark posture.
 */

import { defineScale } from '../../core/density'
import { mode } from '../../core/recipe'
import { iro, kokkaku, type SeriesSlot, sen, zu } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro

const { palette, ink, motion } = zu

/** A named chart color slot: the eight categorical slots plus `zinc`. */
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
	/** Legend / tooltip label ink (HTML text; marks carry the color, text never does). */
	label: ink.label,
	/** Tooltip value ink: the strong element, values lead. */
	value: ink.value,
	/** The paint beside a mark: the ink of its label (`label`) and the stroke of a point marker (`stroke`). */
	mark: {
		/**
		 * The ink of an SVG label beside a mark or a rule: small, semibold, and tabular.
		 * The color of the series or the rule fills it.
		 */
		label: ['text-xs', 'font-semibold', 'tabular-nums'],
		/**
		 * Point-marker stroke: the fill of the surface under the chart, so a dot stays legible
		 * where it crosses an opaque mark or another dot. It reads `--surface-fill`, which a
		 * surface card sets. Without a card, it takes the page ground, as the grid host does.
		 * A white ring in dark mode showed as a halo on each dot.
		 */
		stroke: mode('stroke-(--surface-fill,var(--color-white))', [
			'dark:stroke-(--surface-fill,var(--color-zinc-950))',
			'dark:lg:stroke-(--surface-fill,var(--color-zinc-900))',
		]),
	},
	/**
	 * The hit layer of the plot. Under the `'click'` trigger, the pointer hook sets
	 * `data-hit` on the layer while the pointer is on a mark that a click reads.
	 * The attribute gives the layer the pointer cursor.
	 */
	hit: ['data-hit:cursor-pointer'],
	/** The keyboard focus ring on the plot region when arrow-key navigation is enabled, and on the range legend's scale-bar slider. */
	focus: sen.focus.ring,
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
	/** The touch posture of a root: no text selection under a hold (`readout`), and no double-tap wait (`tap`). */
	touch: {
		/**
		 * The root of a readout surface: a chart, a heatmap, a choropleth, or a map
		 * plot. A long press opens the readout on a map. The surface selects no text
		 * and opens no callout under a hold. Safari on iOS can select text in a
		 * descendant of a `select-none` box, so every descendant also sets it.
		 */
		readout: ['select-none', '**:select-none', '[-webkit-touch-callout:none]'],
		/**
		 * The root of a chart, whose marks take a tap. It turns off the double-tap
		 * zoom, so a tap lands without the wait for a second tap. A pan and a pinch
		 * still work.
		 */
		tap: ['touch-manipulation'],
	},
	/** Motion vocabulary for the mount reveals, from `zu`. `chart-motion.ts` composes the chart's timings from it. */
	/** The gaps of the chart frame. */
	gap: {
		/** The gap of the header and the body of a chart. */
		frame: dan.gap.scale.md,
		/** The gap of the plot and a side legend rail. */
		rail: dan.gap.scale.lg,
		/** The gap of the plot and a legend above or below it. */
		legend: dan.gap.scale.sm,
		/** The gap of the bar and the labels of a range legend. */
		range: dan.gap.scale.sm,
	},
	motion,
	skeleton: kokkaku.chart,
} as const

/** The size scale of {@link ChartSkeleton}: the steps of the block height that it takes with no ratio. */
export const scale = defineScale(dan.size.chart)
