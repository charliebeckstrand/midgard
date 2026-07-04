/**
 * Pure frame layout for the cartesian charts: where the plot rectangle sits
 * inside the frame once the y gutter and x-axis band are reserved, and the
 * per-category tooltip anchors. Kept React-free beside `chart-scale.ts` so
 * the layout math is unit-testable in isolation.
 */

import type { FrameSizing } from '../../hooks'
import type { ChartAxisTick } from './chart-axis'
import {
	BAND_LABEL_HEIGHT,
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	GUTTER_MAX,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from './chart-constants'
import { bandExtent, valueExtent } from './chart-orientation'
import { type BandScale, bandScale, type LinearScale, linearScale } from './chart-scale'

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
 * Resolves a chart frame's sizing policy from its props. An explicit `height`
 * always wins as a fixed pixel box. Otherwise a live `aspectRatio` derives the
 * height from the width, and with the ratio off (or unparseable) the frame is
 * free-form and fills its container. Density never sets a height, so it can't
 * conflict with the ratio.
 *
 * @internal
 */
export function chartFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
): FrameSizing {
	if (height !== undefined) return { mode: 'fixed', height }

	const ratio = ratioValue(aspectRatio)

	return ratio === null ? { mode: 'fill' } : { mode: 'aspect', ratio }
}

/** The plot rectangle inside a chart frame, in `viewBox` user units. @internal */
export type PlotRect = {
	x: number
	y: number
	width: number
	height: number
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
 * The category indexes whose labels fit along an axis without colliding: every
 * label when there is room, else every nth — thinned, never rotated. `slot` is
 * one label's footprint along the axis with a breath of air, so the same math
 * thins by row width (value on x) or by column height (categories down y).
 *
 * @internal
 */
export function thinned(count: number, axisLength: number, slot: number): number[] {
	if (count <= 0) return []

	const fit = Math.max(1, Math.floor(axisLength / Math.max(1, slot)))

	const nth = Math.ceil(count / fit)

	return Array.from({ length: count }, (_, index) => index).filter((index) => index % nth === 0)
}

/**
 * Everything the cartesian frame parts and marks read once the orientation,
 * sizing, and scales resolve — one shape for both orientations, so a chart
 * draws from it without knowing which way it faces. Positions are already
 * projected onto their screen axes: value ticks and snap points along the value
 * axis, band ticks and centers along the categorical axis.
 *
 * @internal
 */
export type CartesianLayout = {
	plot: PlotRect
	/** The value scale, its range already the correct screen axis; `null` for an empty domain. */
	valueScale: LinearScale | null
	/** The categorical band, its range already the cross axis. */
	band: BandScale
	/** The zero line's position along the value axis — bar baselines and the category axis line. */
	baseline: number
	/** Value ticks at their value-axis positions. */
	valueTicks: ChartAxisTick[]
	/** Category labels, thinned, at their band-axis centers. */
	bandTicks: ChartAxisTick[]
	/** Each category's band center — the crosshair's and tooltip's band snap. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the value crosshair's snap targets. */
	snapPoints: number[][]
}

/** The resolved inputs both {@link verticalLayout} and {@link horizontalLayout} read. @internal */
export type CartesianLayoutInput = {
	frameWidth: number
	frameHeight: number
	axes: boolean
	tickTarget: number
	zeroBaseline: boolean
	min?: number
	max?: number
	/** Every candidate value feeding the domain (already stack-summed where stacked). */
	domainValues: number[]
	/** The category label per row — the band axis, and the gutter estimate when horizontal. */
	categories: string[]
	format: (value: number) => string
	count: number
	/** Visible series' values, series-major — the per-category snap points. */
	visibleValues: (number | null)[][]
}

/** Value ticks placed along the value axis by the scale's own map. @internal */
function valueTicksOf(
	scale: LinearScale | null,
	format: (value: number) => string,
): ChartAxisTick[] {
	return (scale?.ticks ?? []).map((tick) => ({ at: scale?.map(tick) ?? 0, label: format(tick) }))
}

/** Per category, the visible finite values in value-axis position — the snap targets. @internal */
function snapPointsOf(
	scale: LinearScale | null,
	count: number,
	visibleValues: (number | null)[][],
): number[][] {
	if (!scale) return []

	return Array.from({ length: count }, (_, index) =>
		visibleValues.reduce<number[]>((positions, series) => {
			const value = series[index]

			if (value != null && Number.isFinite(value)) positions.push(scale.map(value))

			return positions
		}, []),
	)
}

/** Every category's band center, along the band axis. @internal */
function bandCenters(band: BandScale, count: number): number[] {
	return Array.from({ length: count }, (_, index) => band.center(index))
}

/** The fitting category labels at their band centers, thinned by `slot` room along the axis. @internal */
function bandTicksOf(
	categories: string[],
	band: BandScale,
	axisLength: number,
	slot: number,
): ChartAxisTick[] {
	return thinned(categories.length, axisLength, slot).map((index) => ({
		at: band.center(index),
		label: categories[index] ?? '',
	}))
}

/**
 * The default layout: value on y with the scale filling the height above the
 * x-axis band, categories across x. The scale resolves from the frame height
 * first so its tick labels can size the left gutter before the plot rect exists.
 *
 * @internal
 */
export function verticalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, format, frameHeight, frameWidth } = input

	const valueScale = linearScale({
		values: input.domainValues,
		range: [frameHeight - (axes ? X_AXIS_HEIGHT : 0), PLOT_TOP_PAD],
		tickTarget: input.tickTarget,
		zeroBaseline: input.zeroBaseline,
		min: input.min,
		max: input.max,
	})

	const valueTicks = valueTicksOf(valueScale, format)

	const plot = plotRect(
		frameWidth,
		frameHeight,
		axes,
		valueTicks.map((tick) => tick.label),
	)

	const band = bandScale({ count, range: bandExtent('vertical', plot) })

	const longest = categories.reduce((widest, label) => Math.max(widest, label.length), 0)

	return {
		plot,
		valueScale,
		band,
		baseline: valueScale?.map(0) ?? plot.y + plot.height,
		valueTicks,
		bandTicks: bandTicksOf(categories, band, plot.width, longest * TICK_CHAR_WIDTH + GUTTER_GAP),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(valueScale, count, input.visibleValues),
	}
}

/**
 * The transposed layout: value on x with the scale filling the plot width,
 * categories down y. The band labels — not the value ticks — line the left
 * gutter, and they are known up front, so the plot rect resolves first and the
 * value scale fills the width it leaves.
 *
 * @internal
 */
export function horizontalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, format, frameHeight, frameWidth } = input

	const plot = plotRect(frameWidth, frameHeight, axes, categories)

	const valueScale = linearScale({
		values: input.domainValues,
		range: valueExtent('horizontal', plot),
		tickTarget: input.tickTarget,
		zeroBaseline: input.zeroBaseline,
		min: input.min,
		max: input.max,
	})

	const band = bandScale({ count, range: bandExtent('horizontal', plot) })

	return {
		plot,
		valueScale,
		band,
		baseline: valueScale?.map(0) ?? plot.x,
		valueTicks: valueTicksOf(valueScale, format),
		bandTicks: bandTicksOf(categories, band, plot.height, BAND_LABEL_HEIGHT),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(valueScale, count, input.visibleValues),
	}
}
