/**
 * Pure frame layout for the cartesian charts: where the plot rectangle sits
 * inside the frame once the y gutter and x-axis band are reserved, and the
 * per-category tooltip anchors. Kept React-free beside `chart-scale.ts` so
 * the layout math is unit-testable in isolation.
 */

import {
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	GUTTER_MAX,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from './chart-constants'
import type { BandScale } from './chart-scale'

/**
 * A chart's aspect ratio: a `width / height` number, a `"16/9"` string, or
 * `false` to leave the frame free-form (its explicit or density height).
 */
export type ChartAspectRatio = number | `${number}/${number}` | false

/** Parses a {@link ChartAspectRatio} to its numeric `width / height`, or `null` when free-form. @internal */
function ratioValue(ratio: ChartAspectRatio): number | null {
	if (ratio === false) return null

	if (typeof ratio === 'number') return ratio > 0 ? ratio : null

	const [w, h] = ratio.split('/').map(Number)

	return w && h && h > 0 ? w / h : null
}

/**
 * Whether the frame takes its drawing height from the container's measured
 * height (the free-form case): no explicit `height` and no reservable ratio.
 * The one signal that decides whether {@link resolveChartSizing} reads
 * `containerHeight`, so measuring it is worthwhile — every other case derives
 * or fixes the height and ignores the container.
 *
 * @internal
 */
export function chartFillsContainer(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
): boolean {
	return height === undefined && ratioValue(aspectRatio) === null
}

/** A resolved frame size: the drawing height, and the ratio to reserve it in CSS. @internal */
export type ChartSizing = {
	/** The frame's drawing height in px; `0` until the width is measured. */
	height: number
	/**
	 * The `width / height` ratio the plot box reserves through CSS
	 * `aspect-ratio`, or `null` when the height is a fixed pixel value (an
	 * explicit `height`) or fills the container (`aspectRatio: false`).
	 */
	reserveAspect: number | null
}

/**
 * Resolves a chart frame's drawing size — both its height and how the plot box
 * holds that height. An explicit `height` always wins as a fixed pixel box,
 * with nothing to reserve. Otherwise a live `aspectRatio` derives the height
 * from the measured `width` and reserves that same ratio through CSS: taking
 * the height from the box's own width keeps it steady before the width is
 * measured and across every animation replay, where a pixel height off the
 * yet-unmeasured width would collapse to zero and jump. With `aspectRatio` off
 * the frame is free-form and fills its container's measured height. Density
 * never sets a height, so it can't conflict with the ratio.
 *
 * @internal
 */
export function resolveChartSizing(
	width: number,
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
	containerHeight: number,
): ChartSizing {
	if (height !== undefined) return { height, reserveAspect: null }

	const ratio = ratioValue(aspectRatio)

	if (ratio === null) return { height: containerHeight, reserveAspect: null }

	return { height: width > 0 ? Math.round(width / ratio) : 0, reserveAspect: ratio }
}

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

	// Ceil plus edge slack: an estimate rounded down clips the widest label
	// against the SVG's own overflow.
	const gutter = axes
		? Math.min(GUTTER_MAX, Math.ceil(chars * TICK_CHAR_WIDTH) + GUTTER_GAP + GUTTER_EDGE_PAD)
		: 0

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

/**
 * The category indexes whose x labels fit without colliding: every label when
 * there is room, else every nth — thinned, never rotated. The estimate reuses
 * the tabular glyph width, with a slot of air between neighbours.
 *
 * @internal
 */
export function thinnedTicks(count: number, plotWidth: number, longestChars: number): number[] {
	if (count <= 0) return []

	const slot = longestChars * TICK_CHAR_WIDTH + GUTTER_GAP

	const fit = Math.max(1, Math.floor(plotWidth / Math.max(1, slot)))

	const nth = Math.ceil(count / fit)

	return Array.from({ length: count }, (_, index) => index).filter((index) => index % nth === 0)
}
