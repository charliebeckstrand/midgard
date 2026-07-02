import type { Step } from '../../recipes'

/**
 * Density-resolved frame metrics: the values that scale with the size step.
 * Mark specs that must read identically at every density (bar thickness,
 * stroke widths, gaps) live below as flat constants instead.
 *
 * @internal
 */
export type ChartMetrics = {
	/** Default frame height in px (plot plus axis band). */
	height: number
	/** Tick count the value axis aims for. */
	tickTarget: number
}

/** Per-density frame metrics, keyed by the resolved size step. @internal */
export const CHART_METRICS: Record<Step, ChartMetrics> = {
	sm: { height: 160, tickTarget: 3 },
	md: { height: 240, tickTarget: 4 },
	lg: { height: 320, tickTarget: 5 },
}

/** Bar thickness ceiling; the band's leftover stays air, never fill. @internal */
export const BAR_MAX_WIDTH = 24

/** Radius of a bar's rounded data end; the baseline end stays square. @internal */
export const BAR_END_RADIUS = 4

/** Surface-colour gap between touching marks: adjacent bars, pie slices. @internal */
export const MARK_GAP = 2

/** Line series stroke width. @internal */
export const LINE_STROKE_WIDTH = 2

/** Line point-marker radius (≥ 4 so the dot stays legible). @internal */
export const MARKER_RADIUS = 4

/** Surface-colour ring around point markers crossing other marks. @internal */
export const MARKER_RING_WIDTH = 2

/** The area wash's opacity, sitting the fill under its line without muddying it. @internal */
export const AREA_FILL_OPACITY = 0.16

/** Estimated glyph advance of a `text-xs` tabular digit, for the y-gutter estimate. @internal */
export const TICK_CHAR_WIDTH = 7.2

/** Air between the y tick labels and the plot edge. @internal */
export const GUTTER_GAP = 8

/** Slack between the frame edge and the widest label, absorbing estimate error. @internal */
export const GUTTER_EDGE_PAD = 4

/** Y-gutter clamp so extreme labels can't crowd out the plot; roomy enough for currency strings. @internal */
export const GUTTER_MAX = 96

/** Height reserved under the plot for the x tick labels. @internal */
export const X_AXIS_HEIGHT = 24

/** Air above the plot so the top tick label and markers stay inside the frame. @internal */
export const PLOT_TOP_PAD = 8

// Motion timings mirror the Sparkline's (module-private there), so charts and
// sparklines animating side by side read as one family.

/** Line-draw stroke reveal (`pathLength` 0 → 1). @internal */
export const LINE_DRAW = { duration: 0.7, ease: 'easeInOut' } as const

/** Area wash fade, trailing the line so it fills in as the stroke crosses it. @internal */
export const AREA_FADE = { duration: 0.5, delay: 0.15 } as const

/** Point-marker pop, held until the line has finished drawing. @internal */
export const POINT_POP = { duration: 0.25, delay: LINE_DRAW.duration } as const

/** Per-bar grow from the zero baseline. @internal */
export const BAR_GROW = { duration: 0.4, ease: 'easeOut' } as const

/** Delay step between adjacent bar groups, so they rise in sequence. @internal */
export const BAR_STAGGER = 0.05

/** Per-slice fade for the pie, staggered clockwise from the top. @internal */
export const SLICE_FADE = { duration: 0.3, ease: 'easeOut' } as const

/** Delay step between adjacent pie slices. @internal */
export const SLICE_STAGGER = 0.06

/** Combo lines hold until the bars have finished rising. @internal */
export const COMBO_LINE_DELAY = BAR_GROW.duration

/** Quiet window after the last resize before the mount reveal replays once. @internal */
export const RESIZE_SETTLE_MS = 200
