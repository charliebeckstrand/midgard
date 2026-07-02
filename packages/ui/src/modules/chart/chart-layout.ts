/**
 * Pure frame layout for the cartesian charts: where the plot rectangle sits
 * inside the frame once the y gutter and x-axis band are reserved, and the
 * per-category tooltip anchors. Kept React-free beside `chart-scale.ts` so
 * the layout math is unit-testable in isolation.
 */

import {
	GUTTER_GAP,
	GUTTER_MAX,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from './chart-constants'
import type { BandScale } from './chart-scale'

/** The plot rectangle inside a chart frame, in `viewBox` user units. @internal */
export type PlotRect = {
	x: number
	y: number
	width: number
	height: number
}

/** A tooltip anchor: the point the readout attaches to for one category. @internal */
export type ChartAnchor = {
	x: number
	y: number
}

/**
 * Reserves the y gutter and x-axis band inside a `width` × `height` frame and
 * returns the remaining plot rectangle.
 *
 * @remarks The gutter is computed, never measured: tick labels render in
 * tabular figures, so their widest string estimates reliably from its length.
 * With `axes` off both reservations collapse and the plot fills the frame.
 * @internal
 */
export function plotRect(
	width: number,
	height: number,
	axes: boolean,
	tickLabels: string[],
): PlotRect {
	const chars = tickLabels.reduce((widest, label) => Math.max(widest, label.length), 0)

	const gutter = axes ? Math.min(GUTTER_MAX, Math.round(chars * TICK_CHAR_WIDTH) + GUTTER_GAP) : 0

	const axisBand = axes ? X_AXIS_HEIGHT : 0

	return {
		x: gutter,
		y: PLOT_TOP_PAD,
		width: Math.max(0, width - gutter),
		height: Math.max(0, height - PLOT_TOP_PAD - axisBand),
	}
}

/**
 * Tooltip anchors for a band scale: each category's band center at the plot
 * top, so the readout hangs beside the crosshair or hovered group.
 *
 * @internal
 */
export function bandAnchors(band: BandScale, count: number, plot: PlotRect): ChartAnchor[] {
	return Array.from({ length: count }, (_, index) => ({
		x: band.center(index),
		y: plot.y,
	}))
}
