import type { Step } from '../../recipes'

/**
 * Density-resolved frame metrics: the values that scale with the size step.
 * The frame's height is not one of them — it derives from the width and the
 * aspect ratio, so density and a fixed height never conflict. Mark specs that
 * must read identically at every density (bar thickness, stroke widths, gaps)
 * live below as flat constants instead.
 *
 * @internal
 */
export type ChartMetrics = {
	/** Tick count the value axis aims for. */
	tickTarget: number
}

/** Per-density frame metrics, keyed by the resolved size step. @internal */
export const CHART_METRICS: Record<Step, ChartMetrics> = {
	sm: { tickTarget: 3 },
	md: { tickTarget: 4 },
	lg: { tickTarget: 5 },
}

/** Bar thickness ceiling; the band's leftover stays air, never fill. @internal */
export const BAR_MAX_WIDTH = 24

/** Radius of a bar's rounded data end; the baseline end stays square. @internal */
export const BAR_END_RADIUS = 4

/** Surface-colour gap between touching marks: adjacent bars, pie slices. @internal */
export const MARK_GAP = 4

/** Line series stroke width. @internal */
export const LINE_STROKE_WIDTH = 2

/** Line point-marker radius (≥ 5.5 so the dot stays legible). @internal */
export const MARKER_RADIUS = 5.5

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

/**
 * Vertical footprint of one `text-xs` category label stacked in a horizontal
 * chart's left axis — its line box, for thinning band labels by column room the
 * way {@link TICK_CHAR_WIDTH} thins them by row room. @internal
 */
export const BAND_LABEL_HEIGHT = 16

/** Air above the plot so the top tick label and markers stay inside the frame. @internal */
export const PLOT_TOP_PAD = 8

/** Reference-rule stroke width: firm enough to read cleanly over the marks it crosses. @internal */
export const REFERENCE_STROKE_WIDTH = 2

/** Reference-rule dash — coarser than a hairline, so the rule reads as a deliberate annotation. @internal */
export const REFERENCE_DASH = '6 4'

/** Transparent stroke width making the reference rule an easy hover target. @internal */
export const REFERENCE_HIT_WIDTH = 32
