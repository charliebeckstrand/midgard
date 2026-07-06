/**
 * Pure frame layout for the cartesian charts: where the plot rectangle sits
 * inside the frame once the y gutter and x-axis band are reserved, and the
 * per-category tooltip anchors. Kept React-free beside `chart-scale.ts` so
 * the layout math is unit-testable in isolation.
 */

import type { FrameSizing } from '../../hooks'
import type { ChartAxisTick } from './chart-axis'
import {
	AXIS_TITLE_BAND,
	AXIS_TITLE_GAP,
	BAND_LABEL_HEIGHT,
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	GUTTER_MAX,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	TICK_ROTATION_ANGLE,
	TICK_ROTATION_HEIGHT,
	X_AXIS_HEIGHT,
} from './chart-constants'
import { bandExtent, valueExtent } from './chart-orientation'
import { type BandScale, bandScale, type LinearScale, linearScale } from './chart-scale'
import type { ChartValueAxisSide } from './chart-schema'
import { timeTicks } from './chart-time'

/**
 * A chart's aspect ratio: a `width / height` number, a `"16/9"` string, or
 * `false` to leave the frame free-form (its explicit or density height). It
 * governs the whole chart — plot and legend together — so a legended chart fills
 * a fixed-aspect box without the legend spilling past it.
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
 * @remarks The plot-only sizing: the ratio governs the drawing box alone, which
 * a legend then sits beside. The chart family instead resolves through {@link
 * chartFrameLayout}, which folds the legend into the aspect box; {@link
 * HeatmapChart} keeps this one, its range legend never sharing the box.
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

/**
 * A chart frame's sizing once the legend is folded into the aspect box: the
 * {@link FrameSizing} the plot measures through, and the CSS `aspect-ratio` the
 * figure wrapper carries so the whole chart — legend and all — holds the ratio.
 *
 * @internal
 */
export type ChartFrameLayout = {
	/** The policy {@link usePlotFrame} measures and resolves the plot box through. */
	sizing: FrameSizing
	/**
	 * The `width / height` the figure wrapper reserves through CSS `aspect-ratio`
	 * when the legend shares the aspect box, so the plot fills the space the
	 * legend's natural size leaves; `null` when the plot box carries the ratio
	 * itself (no legend) or nothing reserves one.
	 */
	outerAspect: number | null
}

/**
 * Resolves a chart frame's sizing with the legend inside the aspect box, so a
 * ratio describes the whole chart rather than the plot alone. An explicit
 * `height` is a fixed pixel box and a ratio-off frame fills its container, both
 * legend-agnostic — the legend simply bands beside the plot. A live ratio with
 * no legend keeps the plot box reserving that ratio itself (width-driven CSS, no
 * height measurement). A live ratio with a legend hands the ratio to the figure
 * wrapper and measures the plot's remaining height through `aspect-fill`: the
 * CSS aspect box still drives the height from the width, and the measurement
 * only reads back what the legend left — falling back to the full `width / ratio`
 * until it lands — so a chart in a fixed-aspect tile fills it, legend included,
 * without the container-height measurement free-form `fill` needs and without
 * collapsing before the first measurement.
 *
 * @internal
 */
export function chartFrameLayout(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
	hasLegend: boolean,
): ChartFrameLayout {
	if (height !== undefined) return { sizing: { mode: 'fixed', height }, outerAspect: null }

	const ratio = ratioValue(aspectRatio)

	if (ratio === null) return { sizing: { mode: 'fill' }, outerAspect: null }

	if (!hasLegend) return { sizing: { mode: 'aspect', ratio }, outerAspect: null }

	return { sizing: { mode: 'aspect-fill', ratio }, outerAspect: ratio }
}

/** The plot rectangle inside a chart frame, in `viewBox` user units. @internal */
export type PlotRect = {
	x: number
	y: number
	width: number
	height: number
}

/**
 * The gutter width a run of tick `labels` needs: the widest label's estimated
 * advance plus the gap and edge slack, clamped so extreme labels can't crowd
 * out the plot.
 *
 * @remarks Computed, never measured: value ticks render in tabular figures, so
 * their widest string estimates reliably from its length at {@link
 * TICK_CHAR_WIDTH} per glyph. Ceil plus edge slack — an estimate rounded down
 * clips the widest label against the SVG's own overflow. A caller whose gutter
 * holds proportional category labels instead — the heatmap's rows, not digits —
 * passes a wider `charWidth` ({@link LABEL_CHAR_WIDTH}) so a capital-initial
 * label still clears the frame edge.
 * @param charWidth Per-glyph advance estimate for the labels; defaults to the
 * tabular-digit {@link TICK_CHAR_WIDTH}.
 * @internal
 */
function tickGutter(labels: string[], charWidth: number = TICK_CHAR_WIDTH): number {
	const chars = labels.reduce((widest, label) => Math.max(widest, label.length), 0)

	return Math.min(GUTTER_MAX, Math.ceil(chars * charWidth) + GUTTER_GAP + GUTTER_EDGE_PAD)
}

/**
 * Reserves the y gutter and x-axis band inside a `width` × `height` frame and
 * returns the remaining plot rectangle.
 *
 * @remarks With `axes` off both reservations collapse and the plot fills the
 * frame.
 * @param charWidth Per-glyph advance estimate for the gutter labels; defaults to
 * the tabular-digit {@link TICK_CHAR_WIDTH}. The heatmap passes the wider {@link
 * LABEL_CHAR_WIDTH} for its proportional row labels.
 * @internal
 */
export function plotRect(
	width: number,
	height: number,
	axes: boolean,
	tickLabels: string[],
	charWidth: number = TICK_CHAR_WIDTH,
): PlotRect {
	const gutter = axes ? tickGutter(tickLabels, charWidth) : 0

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
 * label when there is room, else every nth — thinned by default. `slot` is one
 * label's footprint along the axis with a breath of air, so the same math
 * thins by row width (value on x) or by column height (categories down y). A
 * vertical chart opted into {@link CartesianFrameProps.tickRotation} tilts
 * instead of thinning once the same fit check fails — see {@link willThin}.
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
 * Whether `count` labels collide at `slot` room along a `axisLength` axis —
 * the same fit check {@link thinned} thins by, exposed so a caller can decide
 * to tilt instead of thin before the ticks themselves are placed.
 *
 * @internal
 */
export function willThin(count: number, axisLength: number, slot: number): boolean {
	return count > Math.max(1, Math.floor(axisLength / Math.max(1, slot)))
}

/**
 * One placed value-axis title: its text, anchor point, and rotation about it.
 * The layout reserves the band the title sits in, so drawing it is a plain
 * `<text>` at the anchor.
 *
 * @internal
 */
export type ChartAxisTitlePlacement = {
	text: string
	x: number
	y: number
	/** Degrees about the anchor: ±90 along a vertical gutter, 0 along a horizontal band. */
	rotate: number
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
	/** The primary (left) value scale, its range already the correct screen axis; `null` for an empty domain. */
	valueScale: LinearScale | null
	/** The secondary (right) value scale; `null` while nothing binds to it. */
	rightScale: LinearScale | null
	/** The categorical band, its range already the cross axis. */
	band: BandScale
	/** The primary zero line's position along the value axis — bar baselines and the category axis line. */
	baseline: number
	/** The secondary scale's zero position, for marks bound to it; falls back to `baseline`. */
	rightBaseline: number
	/** Primary value ticks at their value-axis positions. */
	valueTicks: ChartAxisTick[]
	/** Secondary value ticks; empty without a right scale. */
	rightTicks: ChartAxisTick[]
	/** Category labels, thinned, at their band-axis centers. */
	bandTicks: ChartAxisTick[]
	/** Each category's band center — the crosshair's and tooltip's band snap. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the value crosshair's snap targets. */
	snapPoints: number[][]
	/**
	 * Per category, the series index behind each {@link CartesianLayout.snapPoints}
	 * stop, in the same order — so the keyboard cursor's value lane maps back to the
	 * series it sits on. A gap drops a series from both, keeping them aligned.
	 */
	snapSeries: number[][]
	/** The value-axis titles, placed inside their reserved bands; empty without titles. */
	titles: ChartAxisTitlePlacement[]
}

/** One value axis's resolved layout inputs: domain candidates, pins, formatter, and title. @internal */
export type ChartValueAxisInput = {
	/** Every candidate value feeding this axis's domain (already stack-summed where stacked). */
	domainValues: number[]
	/** Domain floor override, pinned exactly. */
	min?: number
	/** Domain ceiling override, pinned exactly. */
	max?: number
	format: (value: number) => string
	title?: string
}

/** The resolved inputs both {@link verticalLayout} and {@link horizontalLayout} read. @internal */
export type CartesianLayoutInput = {
	frameWidth: number
	frameHeight: number
	axes: boolean
	tickTarget: number
	zeroBaseline: boolean
	/**
	 * The primary (left) value axis. Like {@link CartesianLayoutInput.rightValue}
	 * it is only passed while something binds to it — though the left side is
	 * also the default home, so it stays on whenever no right axis exists.
	 */
	value?: ChartValueAxisInput
	/**
	 * The secondary (right) value axis. Only pass it once something binds to the
	 * axis — a visible right-bound series, a right reference, or a domain pin —
	 * since a zero-baseline chart would otherwise resolve an empty `[0, 1]`
	 * scale and reserve a gutter for nothing.
	 */
	rightValue?: ChartValueAxisInput
	/** The category label per row — the band axis, and the gutter estimate when horizontal. */
	categories: string[]
	/**
	 * Tilt overflowing category labels instead of thinning them; the vertical
	 * layout's own concern, ignored by the horizontal one. See {@link
	 * CartesianFrameProps.tickRotation}.
	 */
	tickRotation?: boolean
	/**
	 * Each row's instant as epoch ms, in row order (`null` where unparseable), when
	 * the band axis is a time axis; `undefined` leaves it categorical.
	 */
	times?: (number | null)[]
	count: number
	/** Visible series' values with their axis binding, series-major — the per-category snap points. */
	visibleValues: VisibleValues[]
}

/**
 * One visible series feeding the snap targets: its per-row values, the axis it
 * reads against, and its own series index — so the position snap points and the
 * parallel series-index map read from one source and stay aligned.
 *
 * @internal
 */
export type VisibleValues = {
	values: (number | null)[]
	side: ChartValueAxisSide
	/** The series' index in the caller's list — what the keyboard cursor maps a stop back to. */
	index: number
}

/** Value ticks placed along the value axis by the scale's own map. @internal */
function valueTicksOf(
	scale: LinearScale | null,
	format: (value: number) => string,
): ChartAxisTick[] {
	return (scale?.ticks ?? []).map((tick) => ({ at: scale?.map(tick) ?? 0, label: format(tick) }))
}

/**
 * Per category, the visible finite values in value-axis position — the snap
 * targets, each series projected through its own axis's scale so a dual-axis
 * chart's crosshair, tooltip, and keyboard cursor land on the drawn marks.
 *
 * @internal
 */
function snapPointsOf(
	scales: ValueScales,
	count: number,
	visibleValues: VisibleValues[],
): number[][] {
	if (!scales.left && !scales.right) return []

	return Array.from({ length: count }, (_, index) =>
		visibleValues.reduce<number[]>((positions, series) => {
			const scale = scales[series.side]

			const value = series.values[index]

			if (scale && snappable(scale, value)) positions.push(scale.map(value))

			return positions
		}, []),
	)
}

/**
 * Whether a datum yields a snap stop: its axis resolved a scale and the value is
 * finite. Shared by {@link snapPointsOf} and {@link snapSeriesOf} so a gap drops
 * the same stop from the positions and the series-index map alike.
 *
 * @internal
 */
function snappable(scale: LinearScale | null, value: number | null | undefined): value is number {
	return scale != null && value != null && Number.isFinite(value)
}

/**
 * Per category, the series index behind each snap stop — the same stops
 * {@link snapPointsOf} positions, in the same order, filtered by the same
 * {@link snappable} gate, so the keyboard cursor's value lane resolves to the
 * series it sits on even where a leading gap has shifted the stops.
 *
 * @internal
 */
function snapSeriesOf(
	scales: ValueScales,
	count: number,
	visibleValues: VisibleValues[],
): number[][] {
	if (!scales.left && !scales.right) return []

	return Array.from({ length: count }, (_, index) =>
		visibleValues.reduce<number[]>((series, entry) => {
			if (snappable(scales[entry.side], entry.values[index])) series.push(entry.index)

			return series
		}, []),
	)
}

/** Every category's band center, along the band axis. @internal */
function bandCenters(band: BandScale, count: number): number[] {
	return Array.from({ length: count }, (_, index) => band.center(index))
}

/**
 * The category labels at their band centers: every one tilted at {@link
 * TICK_ROTATION_ANGLE} when `tilt` is on, else thinned by `slot` room along
 * the axis.
 *
 * @internal
 */
function bandTicksOf(
	categories: string[],
	band: BandScale,
	axisLength: number,
	slot: number,
	tilt: boolean,
): ChartAxisTick[] {
	if (tilt) {
		return categories.map((label, index) => ({
			at: band.center(index),
			label,
			rotate: TICK_ROTATION_ANGLE,
		}))
	}

	return thinned(categories.length, axisLength, slot).map((index) => ({
		at: band.center(index),
		label: categories[index] ?? '',
	}))
}

/**
 * The band axis's ticks: calendar-boundary time ticks when the input carries
 * row instants and they span an axis, else the category labels, tilted or
 * thinned. Both orientations share it — the band scale's range already faces
 * the right screen axis, so the tick positions land correctly either way;
 * `tilt` only ever arrives set from the vertical layout, since a horizontal
 * chart's category labels already run down the gutter and read straight.
 *
 * @internal
 */
function bandAxisTicks(
	input: CartesianLayoutInput,
	band: BandScale,
	axisLength: number,
	slot: number,
	tilt = false,
): ChartAxisTick[] {
	if (input.times) {
		const ticks = timeTicks({
			times: input.times,
			band,
			tickTarget: input.tickTarget,
			axisLength,
		})

		if (ticks) return ticks
	}

	return bandTicksOf(input.categories, band, axisLength, slot, tilt)
}

/** One value axis's scale over its inputs, or `null` when nothing yields a domain. @internal */
function valueScaleOf(
	axis: ChartValueAxisInput | undefined,
	range: [number, number],
	tickTarget: number,
	zeroBaseline: boolean,
): LinearScale | null {
	if (!axis) return null

	return linearScale({
		values: axis.domainValues,
		range,
		tickTarget,
		zeroBaseline,
		min: axis.min,
		max: axis.max,
	})
}

/** Both value scales resolved over one shared screen range. @internal */
type ValueScales = Record<ChartValueAxisSide, LinearScale | null>

/**
 * A value axis's gutter: its tick labels plus, where titled, the title band and
 * a gap between the title and the labels so the two never crowd; `0` with the
 * axis off.
 *
 * @internal
 */
function valueGutter(on: boolean, ticks: ChartAxisTick[], title: string | undefined): number {
	if (!on) return 0

	return (
		tickGutter(ticks.map((tick) => tick.label)) + (title ? AXIS_TITLE_BAND + AXIS_TITLE_GAP : 0)
	)
}

/** The zero position of `scale`, else of `other`, else the plot-edge fallback. @internal */
function zeroOf(scale: LinearScale | null, other: LinearScale | null, edge: number): number {
	return scale?.map(0) ?? other?.map(0) ?? edge
}

/** The vertical layout's rotated gutter titles, one per titled axis with a resolved scale. @internal */
function verticalTitles(
	input: CartesianLayoutInput,
	scales: ValueScales,
	plot: PlotRect,
	frameWidth: number,
): ChartAxisTitlePlacement[] {
	const titles: ChartAxisTitlePlacement[] = []

	const y = plot.y + plot.height / 2

	if (input.axes && scales.left && input.value?.title) {
		titles.push({ text: input.value.title, x: AXIS_TITLE_BAND / 2, y, rotate: -90 })
	}

	if (input.axes && scales.right && input.rightValue?.title) {
		titles.push({
			text: input.rightValue.title,
			x: frameWidth - AXIS_TITLE_BAND / 2,
			y,
			rotate: 90,
		})
	}

	return titles
}

/** One vertical layout's value scales and their formatted gutter ticks, against a resolved y-range. @internal */
type VerticalValueAxes = {
	valueScale: LinearScale | null
	rightScale: LinearScale | null
	valueTicks: ChartAxisTick[]
	rightTicks: ChartAxisTick[]
}

/**
 * Both value scales and their gutter tick labels for a vertical layout's
 * `range`. Split out of {@link verticalLayout} so it can resolve twice — once
 * against the flat x-axis band to size the gutters and probe whether the
 * category labels fit, again against a taller band once tilting them wins the
 * room back instead — without duplicating the scale wiring inline.
 *
 * @internal
 */
function verticalValueAxes(
	input: CartesianLayoutInput,
	range: [number, number],
): VerticalValueAxes {
	const valueScale = valueScaleOf(input.value, range, input.tickTarget, input.zeroBaseline)

	const rightScale = valueScaleOf(input.rightValue, range, input.tickTarget, input.zeroBaseline)

	const valueTicks = valueScale && input.value ? valueTicksOf(valueScale, input.value.format) : []

	const rightTicks =
		rightScale && input.rightValue ? valueTicksOf(rightScale, input.rightValue.format) : []

	return { valueScale, rightScale, valueTicks, rightTicks }
}

/**
 * The default layout: value on y with the scales filling the height above the
 * x-axis band, categories across x. The scales resolve from the frame height
 * first so their tick labels can size the side gutters before the plot rect
 * exists; the right gutter appears only once a right scale resolves. Category
 * labels that would collide at the flat band height either thin (the default)
 * or, under {@link CartesianFrameProps.tickRotation}, tilt instead — which
 * takes the band-height decision, so the value scales resolve a second time
 * against the taller band once tilting wins.
 *
 * @internal
 */
export function verticalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, frameHeight, frameWidth } = input

	const flatHeight = axes ? X_AXIS_HEIGHT : 0

	const flatRange: [number, number] = [frameHeight - flatHeight, PLOT_TOP_PAD]

	const flatAxes = verticalValueAxes(input, flatRange)

	// Each side reserves its own gutter — tick labels plus a title band where a
	// title is set — so the plot narrows only for the chrome actually drawn.
	// Independent of the x-axis band height, so it need not wait on the tilt
	// decision below.
	const leftGutter = valueGutter(
		axes && flatAxes.valueScale !== null,
		flatAxes.valueTicks,
		input.value?.title,
	)

	const rightGutter = valueGutter(
		axes && flatAxes.rightScale !== null,
		flatAxes.rightTicks,
		input.rightValue?.title,
	)

	const plotWidth = Math.max(0, frameWidth - leftGutter - rightGutter)

	const longest = categories.reduce((widest, label) => Math.max(widest, label.length), 0)

	const slot = longest * TICK_CHAR_WIDTH + GUTTER_GAP

	const tilt = axes && Boolean(input.tickRotation) && willThin(count, plotWidth, slot)

	const axisBandHeight = axes ? (tilt ? TICK_ROTATION_HEIGHT : X_AXIS_HEIGHT) : 0

	const { valueScale, rightScale, valueTicks, rightTicks } = tilt
		? verticalValueAxes(input, [frameHeight - axisBandHeight, PLOT_TOP_PAD])
		: flatAxes

	const plot: PlotRect = {
		x: leftGutter,
		y: PLOT_TOP_PAD,
		width: plotWidth,
		height: Math.max(0, frameHeight - PLOT_TOP_PAD - axisBandHeight),
	}

	const band = bandScale({ count, range: bandExtent('vertical', plot) })

	const scales: ValueScales = { left: valueScale, right: rightScale }

	const floor = plot.y + plot.height

	return {
		plot,
		valueScale,
		rightScale,
		band,
		baseline: zeroOf(valueScale, rightScale, floor),
		rightBaseline: zeroOf(rightScale, valueScale, floor),
		valueTicks,
		rightTicks,
		bandTicks: bandAxisTicks(input, band, plot.width, slot, tilt),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(scales, count, input.visibleValues),
		snapSeries: snapSeriesOf(scales, count, input.visibleValues),
		titles: verticalTitles(input, scales, plot, frameWidth),
	}
}

/** A probe scale's ticks paired with their formatter — the end-label inset inputs. @internal */
type ValueAxisProbe = { ticks: number[]; format: (value: number) => string }

/**
 * A range-free probe of one value axis: its resolved ticks and formatter, or
 * `null` when nothing yields a domain. Tick values are range-independent, so
 * the probe answers both what the end labels need and whether the axis exists
 * before the plot is known.
 *
 * @internal
 */
function probeOf(
	axis: ChartValueAxisInput | undefined,
	tickTarget: number,
	zeroBaseline: boolean,
): ValueAxisProbe | null {
	const scale = valueScaleOf(axis, [0, 1], tickTarget, zeroBaseline)

	return scale && axis ? { ticks: scale.ticks, format: axis.format } : null
}

/**
 * Insets a horizontal value axis's screen range so its end tick labels — drawn
 * centred on their axis bands — fit inside the frame instead of overhanging it.
 * The right end borders the frame edge, so it always reserves the last label's
 * half-width; the left end reserves the first label's only when the category
 * gutter can't already absorb it. With two axes each end takes the wider of the
 * two labels; a frame too narrow to seat both keeps the span, since a clipped
 * label beats an inverted axis.
 *
 * @internal
 */
function valueAxisRange(probes: ValueAxisProbe[], span: [number, number]): [number, number] {
	const half = (tick: number, format: (value: number) => string) =>
		(format(tick).length * TICK_CHAR_WIDTH) / 2 + GUTTER_EDGE_PAD

	const live = probes.filter((probe) => probe.ticks.length > 0)

	if (live.length === 0) return span

	const [from, to] = span

	const insetFrom = Math.max(
		from,
		...live.map((probe) => half(probe.ticks[0] as number, probe.format)),
	)

	const insetTo =
		to - Math.max(...live.map((probe) => half(probe.ticks.at(-1) as number, probe.format)))

	return insetFrom < insetTo ? [insetFrom, insetTo] : span
}

/** The horizontal layout's band titles, centered under the bottom axis and over the top one. @internal */
function horizontalTitles(
	input: CartesianLayoutInput,
	scales: ValueScales,
	plot: PlotRect,
): ChartAxisTitlePlacement[] {
	const titles: ChartAxisTitlePlacement[] = []

	const x = plot.x + plot.width / 2

	if (input.axes && scales.left && input.value?.title) {
		titles.push({
			text: input.value.title,
			x,
			y: plot.y + plot.height + X_AXIS_HEIGHT + AXIS_TITLE_BAND / 2,
			rotate: 0,
		})
	}

	if (input.axes && scales.right && input.rightValue?.title) {
		titles.push({
			text: input.rightValue.title,
			x,
			y: plot.y - X_AXIS_HEIGHT - AXIS_TITLE_BAND / 2,
			rotate: 0,
		})
	}

	return titles
}

/**
 * The transposed layout: value on x with the scales filling the plot width,
 * categories down y. The band labels — not the value ticks — line the left
 * gutter, and they are known up front, so the plot rect resolves first and the
 * value scales fill the width it leaves, inset so the end labels clear the
 * frame. The secondary axis's labels line a band above the plot — the
 * transpose of the vertical layout's right gutter — reserved only once its
 * probe resolves.
 *
 * @internal
 */
export function horizontalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, frameHeight, frameWidth } = input

	const rightProbe = probeOf(input.rightValue, input.tickTarget, input.zeroBaseline)

	const bottomBand = axes ? X_AXIS_HEIGHT + (input.value?.title ? AXIS_TITLE_BAND : 0) : 0

	const topBand =
		axes && rightProbe ? X_AXIS_HEIGHT + (input.rightValue?.title ? AXIS_TITLE_BAND : 0) : 0

	const gutter = axes ? tickGutter(categories) : 0

	const plot: PlotRect = {
		x: gutter,
		y: PLOT_TOP_PAD + topBand,
		width: Math.max(0, frameWidth - gutter),
		height: Math.max(0, frameHeight - PLOT_TOP_PAD - topBand - bottomBand),
	}

	const span = valueExtent('horizontal', plot)

	const leftProbe = probeOf(input.value, input.tickTarget, input.zeroBaseline)

	const probes = [leftProbe, rightProbe].filter((probe): probe is ValueAxisProbe => probe !== null)

	// The value labels centre on their ticks, so without axes there is nothing
	// to reserve for and the scales fill the whole span.
	const range = axes ? valueAxisRange(probes, span) : span

	const valueScale = valueScaleOf(input.value, range, input.tickTarget, input.zeroBaseline)

	const rightScale = valueScaleOf(input.rightValue, range, input.tickTarget, input.zeroBaseline)

	const band = bandScale({ count, range: bandExtent('horizontal', plot) })

	const scales: ValueScales = { left: valueScale, right: rightScale }

	return {
		plot,
		valueScale,
		rightScale,
		band,
		baseline: zeroOf(valueScale, rightScale, plot.x),
		rightBaseline: zeroOf(rightScale, valueScale, plot.x),
		valueTicks: valueScale && input.value ? valueTicksOf(valueScale, input.value.format) : [],
		rightTicks:
			rightScale && input.rightValue ? valueTicksOf(rightScale, input.rightValue.format) : [],
		bandTicks: bandAxisTicks(input, band, plot.height, BAND_LABEL_HEIGHT),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(scales, count, input.visibleValues),
		snapSeries: snapSeriesOf(scales, count, input.visibleValues),
		titles: horizontalTitles(input, scales, plot),
	}
}
