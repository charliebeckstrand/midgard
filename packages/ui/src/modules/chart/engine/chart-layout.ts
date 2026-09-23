/**
 * Pure frame layout for the cartesian charts. The plot rectangle sits inside
 * the frame once the y gutter and x-axis band are reserved. The per-category
 * tooltip anchors resolve here too. Kept React-free beside `chart-scale.ts` so
 * the layout math is unit-testable in isolation.
 */

import type { FrameSizing } from '../../../hooks'
import { parseAspectRatio } from '../../../utilities'
import type { ChartAxisTick } from './chart-axes/axis'
import type { ChartValueAxisId } from './chart-axes/schema'
import {
	AXIS_TITLE_BAND,
	AXIS_TITLE_GAP,
	BAND_EDGE_PAD,
	BAND_LABEL_HEIGHT,
	FLOOR_LABEL_PAD,
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	GUTTER_MAX,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	TICK_ROTATION_ANGLE,
	TICK_ROTATION_HEIGHT,
	X_AXIS_HEIGHT,
} from './chart-constants'
import { bandExtent, valueExtent } from './chart-orientation'
import {
	type BandScale,
	bandScale,
	headroomFits,
	type LinearScale,
	linearScale,
} from './chart-scale'
import type { ChartBandAxisMode } from './chart-tier'
import { timeTicks } from './chart-time'

/**
 * A chart's aspect ratio: a `width / height` number, a `"16/9"` string, or
 * `false` to leave the frame free-form (its explicit or density height). The
 * ratio is a preference, not a demand. A definite-height parent shorter than it
 * clamps the chart. The chart then fills the height that leaves, rather than
 * overflowing — the box is law.
 *
 * A stacked (top / bottom) legend folds into the aspect box. The ratio there
 * governs the whole chart, so a legended chart fills a fixed-aspect tile
 * without the band spilling past it. A side (left / right) legend instead bands
 * beside the plot at its own width. The ratio there governs the plot alone, and
 * the drawing never squeezes to fit the panel.
 */
export type ChartAspectRatio = number | `${number}/${number}` | false

/**
 * Resolves a chart frame's sizing policy from its props. An explicit `height`
 * always wins as a fixed pixel box. Otherwise a live `aspectRatio` derives the
 * height from the width, and with the ratio off (or unparseable) the frame is
 * free-form and fills its container. Density never sets a height, so it can't
 * conflict with the ratio.
 *
 * @remarks The plot-only sizing: the ratio governs the drawing box alone, which
 * a legend then sits beside. The chart family instead resolves through {@link
 * chartFrameLayout}. That one carries the ratio on the figure, so a
 * definite-height parent clamps the whole chart (a side legend still bands
 * beside the plot). {@link HeatmapChart} keeps this one, its range legend never
 * sharing the box.
 * @internal
 */
export function chartFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
): FrameSizing {
	if (height !== undefined) return { mode: 'fixed', height }

	const ratio = parseAspectRatio(aspectRatio)

	return ratio === null ? { mode: 'fill' } : { mode: 'aspect', ratio }
}

/**
 * Whether a frame's plot grows into its region's height rather than reserving
 * one: the free-form `fill` and stacked `aspect-fill` modes. The one place the
 * two fill modes are read together — distinct from {@link chartPolicy}'s `fill`
 * flag, which is the free-form mode alone.
 *
 * @internal
 */
export function frameFills(sizing: FrameSizing): boolean {
	return sizing.mode === 'fill' || sizing.mode === 'aspect-fill'
}

/**
 * A chart frame's sizing under the box-law: the {@link FrameSizing} the plot
 * measures through, and the CSS `aspect-ratio` the figure wrapper carries. The
 * whole chart — legend and all — holds the ratio as a preference the parent can
 * clamp.
 *
 * @internal
 */
export type ChartFrameLayout = {
	/** The policy {@link usePlotFrame} measures and resolves the plot box through. */
	sizing: FrameSizing
	/**
	 * The `width / height` the figure wrapper reserves through CSS `aspect-ratio`
	 * whenever a live ratio governs the whole chart — no legend or a stacked band.
	 * The plot then fills the space the legend's natural size leaves, and a
	 * definite-height parent clamps the figure. It is `null` when the plot box
	 * carries the ratio itself (a side legend banding beside it), or when nothing
	 * reserves one.
	 */
	outerAspect: number | null
}

/**
 * Resolves a chart frame's sizing under the box-law. A live aspect ratio is a
 * preference a definite-height parent can clamp. It is never a height the
 * drawing forces on the box. An explicit `height` is a fixed pixel box and a
 * ratio-off frame fills its container, both legend-agnostic.
 *
 * A live ratio hands the ratio to the figure wrapper as a CSS `aspect-ratio`. It
 * measures the plot's own resolved height through `aspect-fill`. A parent
 * shorter than the ratio's preference therefore clamps the whole chart, and the
 * plot fills whatever height actually resolved. The drawing fits the box rather
 * than overflowing it, a stacked legend's band folding into the same box.
 *
 * The measurement falls back to the full `width / ratio` until it lands. A
 * server render, an explicit `width`, or a test frame therefore still resolves a
 * deterministic height from the width alone.
 *
 * Only a side legend keeps the ratio on the plot box itself (`aspect`). It bands
 * beside the plot at its own width. The drawing therefore holds its ratio next
 * to the panel, rather than sharing a box with it.
 *
 * @param aside Whether the legend bands beside the plot (a left / right panel)
 * rather than above or below it. A side legend keeps the ratio on the plot box.
 * Every other live-ratio frame carries it on the figure, so the parent can clamp
 * the chart.
 * @internal
 */
export function chartFrameLayout(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
	aside: boolean,
): ChartFrameLayout {
	if (height !== undefined) return { sizing: { mode: 'fixed', height }, outerAspect: null }

	const ratio = parseAspectRatio(aspectRatio)

	if (ratio === null) return { sizing: { mode: 'fill' }, outerAspect: null }

	// A side legend bands beside the plot at its own width, so the plot box holds
	// the ratio itself and the drawing never squeezes to fit the panel.
	if (aside) return { sizing: { mode: 'aspect', ratio }, outerAspect: null }

	// No legend or a stacked band: the figure carries the ratio and the plot
	// measures its resolved height, so a definite-height parent clamps the chart
	// (the box is law) rather than the drawing overflowing it.
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
 * advance plus the gap and edge slack. The clamp keeps extreme labels from
 * crowding out the plot.
 *
 * The character count rounds up to an even number first. The gutter — and the
 * plot with its right-anchored labels — therefore holds steady when the widest
 * label swings by a single character. A nice-tick axis topping out at `8,000`
 * and one at `40,000` reserve the same width. The gutter steps only once the
 * count grows by two, a change of scale large enough to be worth the reflow.
 * Without it a filter that nudges the magnitude by a digit, or two charts
 * sharing a tile, would slide the plot sideways.
 *
 * @remarks Computed, never measured: value ticks render in tabular figures, so
 * their widest string estimates reliably from its length at {@link
 * TICK_CHAR_WIDTH} per glyph. Ceil plus edge slack: an estimate rounded down
 * clips the widest label against the SVG's own overflow. The even round-up only
 * ever reserves more, so it never clips either. A caller whose gutter holds
 * proportional category labels instead — the heatmap's rows, not digits —
 * passes a wider `charWidth` ({@link LABEL_CHAR_WIDTH}). A capital-initial label
 * then still clears the frame edge.
 * @param charWidth Per-glyph advance estimate for the labels; defaults to the
 * tabular-digit {@link TICK_CHAR_WIDTH}.
 * @internal
 */
function tickGutter(labels: string[], charWidth: number = TICK_CHAR_WIDTH): number {
	const widest = longestLength(labels)

	// Round the count up to an even number so a one-character swing in the widest
	// label (`8,000` ↔ `40,000`) leaves the gutter where it is — see the doc above.
	const chars = widest + (widest % 2)

	return Math.min(GUTTER_MAX, Math.ceil(chars * charWidth) + GUTTER_GAP + GUTTER_EDGE_PAD)
}

/** The character length of the longest label, or 0 for none. @internal */
function longestLength(labels: string[]): number {
	return labels.reduce((longest, label) => Math.max(longest, label.length), 0)
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
 * label's footprint along the axis with a breath of air. The same math
 * therefore thins by row width (value on x) or by column height (categories
 * down y). A vertical chart opted into {@link ChartCategoryAxis.tickRotation}
 * tilts instead of thinning once the same fit check fails — see
 * {@link willThin}.
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
 * Whether `count` labels collide at `slot` room along a `axisLength` axis. It
 * is the same fit check {@link thinned} thins by, exposed so a caller can tilt
 * instead of thin before the ticks are placed.
 *
 * @internal
 */
export function willThin(count: number, axisLength: number, slot: number): boolean {
	return count > Math.max(1, Math.floor(axisLength / Math.max(1, slot)))
}

/**
 * One placed axis title (value or band): its text, anchor point, and rotation
 * about it.
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
 * sizing, and scales resolve. One shape serves both orientations, so a chart
 * draws from it without knowing which way it faces. Positions are already
 * projected onto their screen axes: value ticks and snap points along the value
 * axis, band ticks and centers along the categorical axis.
 *
 * @internal
 */
export type CartesianLayout = {
	plot: PlotRect
	/** The primary value scale, its range already the correct screen axis; `null` for an empty domain. */
	valueScale: LinearScale | null
	/** The secondary value scale; `null` while nothing binds to it. */
	value2Scale: LinearScale | null
	/** The categorical band, its range already the cross axis. */
	band: BandScale
	/** The primary zero line's position along the value axis — bar baselines and the category axis line. */
	baseline: number
	/** The secondary scale's zero position, for marks bound to it; falls back to `baseline`. */
	value2Baseline: number
	/** Primary value ticks at their value-axis positions. */
	valueTicks: ChartAxisTick[]
	/** Secondary value ticks; empty without a secondary scale. */
	value2Ticks: ChartAxisTick[]
	/** Category labels, thinned, at their band-axis centers. */
	bandTicks: ChartAxisTick[]
	/** Each category's band center — the crosshair's and tooltip's band snap. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the value crosshair's snap targets. */
	snapPoints: number[][]
	/**
	 * Per category, the series index behind each {@link CartesianLayout.snapPoints}
	 * stop, in the same order. The keyboard cursor's value lane therefore maps back
	 * to the series it sits on. A gap drops a series from both, keeping them
	 * aligned.
	 */
	snapSeries: number[][]
	/** The axis titles (value and band), placed inside their reserved bands; empty without titles. */
	titles: ChartAxisTitlePlacement[]
	/**
	 * Whether the {@link CartesianLayoutInput.valueHeadroom} asked for was
	 * affordable. `false` sheds every point value label AND withholds the
	 * scale's reservation. A plot too short to afford the room would otherwise
	 * place labels back on the flip boundary the reservation exists to clear. It
	 * would also pad the domain for labels that never draw.
	 *
	 * The vertical verdict reads the range floor under the tallest band chrome
	 * the chart can wear (see {@link verticalLabelRoom}). It therefore moves one
	 * way as the frame shrinks, instead of flashing labels back on when a smaller
	 * tier drops the band row. `true` when nothing was asked.
	 */
	valueLabelRoom: boolean
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
	 * The primary value axis. Like {@link CartesianLayoutInput.value2} it is only
	 * passed while something binds to it. The primary is also the default home,
	 * so it stays on whenever no secondary axis exists.
	 */
	value?: ChartValueAxisInput
	/**
	 * The secondary value axis. It is only passed once something binds to the
	 * axis: a visible `y2`-bound series, a `y2` reference, or a domain pin. A
	 * zero-baseline chart would otherwise resolve an empty `[0, 1]` scale and
	 * reserve a gutter for nothing.
	 */
	value2?: ChartValueAxisInput
	/** The category label per row — the band axis, and the gutter estimate when horizontal. */
	categories: string[]
	/**
	 * The band (category) axis's title, drawn past its labels with a band reserved
	 * for it. It sits under them when vertical, and rotates into the left gutter
	 * when horizontal. Already gated by the tier's title budget, so a set value
	 * always draws.
	 */
	bandTitle?: string
	/**
	 * Tilt overflowing category labels instead of thinning them; the vertical
	 * layout's own concern, ignored by the horizontal one. See {@link
	 * ChartCategoryAxis.tickRotation}.
	 */
	tickRotation?: boolean
	/**
	 * How the band axis presents at the frame's resolved tier:
	 *
	 * - `'thinned'` — every fitting label. The default, and today's behaviour.
	 * - `'ends'` — only the first and last, in a compact frame.
	 * - `'off'` — no band row at all, in a short frame.
	 *
	 * `'off'` returns the band row's height to the plot. The value gutter keeps a
	 * floor pad there for its zero label. Left unset it thins, so a caller passing
	 * no tier reads as before.
	 * @defaultValue 'thinned'
	 */
	bandAxis?: ChartBandAxisMode
	/**
	 * Each row's instant as epoch ms, in row order (`null` where unparseable), when
	 * the band axis is a time axis; `undefined` leaves it categorical.
	 */
	times?: (number | null)[]
	/**
	 * BCP 47 tag for the time axis's calendar ticks: it sets both their label
	 * format and the first weekday a week tick floors to. `undefined` falls back
	 * to the runtime locale.
	 */
	locale?: string
	count: number
	/** Visible series' values with their axis binding, series-major — the per-category snap points. */
	visibleValues: VisibleValues[]
	/**
	 * How far, in px, the chart's widest mark paints past its data coordinate — a
	 * point marker's ring edge, a line stroke's half-width. With the axis chrome
	 * off (spark, or an explicit axes-less frame) both layouts reserve it on every
	 * plot edge. An extreme's mark then clears the frame, which the gutters and
	 * bands would otherwise absorb it into. `0` (bars, cells — marks that end at
	 * their
	 * coordinate) reserves nothing.
	 * @defaultValue 0
	 */
	markInset?: number
	/**
	 * Pixels of clear room to reserve between a data extreme and its unpinned
	 * value-axis edge. An extreme's value label then sits above the peak or below
	 * the trough, rather than flipping onto the line. The `LineChart` sets it when
	 * it draws single-series extreme labels. `0` is the default, and every other
	 * chart reserves nothing.
	 * @defaultValue 0
	 */
	valueHeadroom?: number
}

/**
 * How far a line-drawn series' marks paint past their data coordinate: the dot
 * marker's ring edge under `points`, else the path stroke's half-width. The
 * {@link CartesianLayoutInput.markInset} the line, area, and combo charts pass,
 * shared so the reach tracks the mark constants from one place.
 *
 * @internal
 */
export function lineMarkReach(points: boolean): number {
	return points ? MARKER_RADIUS + MARKER_RING_WIDTH / 2 : LINE_STROKE_WIDTH / 2
}

/**
 * The mark reach each plot edge reserves: the input's {@link
 * CartesianLayoutInput.markInset}, and only without the axis chrome. The
 * gutters and bands of a framed chart absorb the overhang themselves.
 *
 * @internal
 */
function markPadOf(input: CartesianLayoutInput): number {
	return input.axes ? 0 : (input.markInset ?? 0)
}

/**
 * The band axis's edge inset. A framed chart holds its end categories a fixed
 * {@link BAND_EDGE_PAD} margin off the plot's sides. An edge label therefore
 * never crowds the value gutter, and the endpoint marks breathe. A spark chart
 * insets by its mark reach ({@link markPadOf}) instead, just clearing an
 * endpoint marker.
 *
 * @internal
 */
function bandPadOf(input: CartesianLayoutInput): number {
	return input.axes ? BAND_EDGE_PAD : markPadOf(input)
}

/**
 * Insets both ends of a screen range, ascending or descending. It holds the
 * span where the range is too narrow to seat both insets, since a clipped mark
 * beats an inverted scale.
 *
 * @internal
 */
function markInsetRange(range: [number, number], inset: number): [number, number] {
	if (inset <= 0) return range

	const [from, to] = range

	const direction = Math.sign(to - from)

	const insetFrom = from + direction * inset

	const insetTo = to - direction * inset

	return Math.sign(insetTo - insetFrom) === direction ? [insetFrom, insetTo] : range
}

/**
 * One visible series feeding the snap targets: its per-row values, the axis it
 * reads against, and its own series index. The position snap points and the
 * parallel series-index map therefore read from one source and stay aligned.
 *
 * @internal
 */
export type VisibleValues = {
	values: (number | null)[]
	axis: ChartValueAxisId
	/** The series' index in the caller's list — what the keyboard cursor maps a stop back to. */
	index: number
}

/** Value ticks placed along the value axis by the scale's own map. @internal */
export function valueTicksOf(
	scale: LinearScale | null,
	format: (value: number) => string,
): ChartAxisTick[] {
	// Keyed by the value, not the mapped `at`: a zero-height plot maps every tick
	// onto one coordinate, so `at` collides there while the value stays distinct
	// (two ticks share a value only on a zero-span domain, which yields one tick).
	return (scale?.ticks ?? []).map((tick) => ({
		at: scale?.map(tick) ?? 0,
		label: format(tick),
		key: tick,
	}))
}

/**
 * Per category, the visible finite values in value-axis position — the snap
 * targets. Each series projects through its own axis's scale, so a dual-axis
 * chart's crosshair, tooltip, and keyboard cursor land on the drawn marks.
 *
 * @internal
 */
function snapPointsOf(
	scales: ValueScales,
	count: number,
	visibleValues: VisibleValues[],
): number[][] {
	if (!scales.y && !scales.y2) return []

	return Array.from({ length: count }, (_, index) => {
		const positions: number[] = []

		for (const series of visibleValues) {
			const scale = scales[series.axis]

			const value = series.values[index]

			if (scale && snappable(scale, value)) positions.push(scale.map(value))
		}

		return positions
	})
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
 * Per category, the series index behind each snap stop. These are the same
 * stops {@link snapPointsOf} positions, in the same order, filtered by the same
 * {@link snappable} gate. The keyboard cursor's value lane therefore resolves to
 * the series it sits on, even where a leading gap has shifted the stops.
 *
 * @internal
 */
function snapSeriesOf(
	scales: ValueScales,
	count: number,
	visibleValues: VisibleValues[],
): number[][] {
	if (!scales.y && !scales.y2) return []

	return Array.from({ length: count }, (_, index) => {
		const series: number[] = []

		for (const entry of visibleValues) {
			if (snappable(scales[entry.axis], entry.values[index])) series.push(entry.index)
		}

		return series
	})
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
	// Keyed by the category index, not the band center `at`: a zero-width band
	// collapses every center onto one coordinate, so `at` collides while the index
	// stays the category's stable identity across resizes and thinning changes.
	if (tilt) {
		return categories.map((label, index) => ({
			at: band.center(index),
			label,
			key: index,
			rotate: TICK_ROTATION_ANGLE,
		}))
	}

	return thinned(categories.length, axisLength, slot).map((index) => ({
		at: band.center(index),
		label: categories[index] ?? '',
		key: index,
	}))
}

/**
 * The first and last category labels only — the compact tier's band, where a
 * full run of thinned labels would crowd a narrow plot. Each end anchors inward
 * (`'start'` first, `'end'` last) from its band center. It therefore reads away
 * from the frame edge and clears it without a width estimate. The vertical
 * x-axis honours the anchor, while the horizontal y-axis right-aligns its gutter
 * labels and ignores it. A single category reads as one centered label; an empty
 * axis none.
 *
 * @internal
 */
function endBandTicks(categories: string[], band: BandScale): ChartAxisTick[] {
	const last = categories.length - 1

	if (last < 0) return []

	if (last === 0) return [{ at: band.center(0), label: categories[0] ?? '', key: 0 }]

	return [
		{ at: band.center(0), label: categories[0] ?? '', key: 0, anchor: 'start' },
		{ at: band.center(last), label: categories[last] ?? '', key: last, anchor: 'end' },
	]
}

/**
 * The band axis's ticks at its resolved `mode`:
 *
 * - `'off'` — none.
 * - `'ends'` — only the first and last labels.
 * - Otherwise calendar-boundary time ticks, when the input carries row instants
 *   that span an axis; else the category labels, tilted or thinned.
 *
 * Both orientations share it. The band scale's range already faces the right
 * screen axis, so the tick positions land correctly either way. `tilt` only ever
 * arrives set from the vertical layout, since a horizontal chart's category
 * labels already run down the gutter and read straight. A time
 * axis keeps its calendar ticks over `'ends'`, since its own tick target already
 * thins them to a few in a small frame.
 *
 * @internal
 */
function bandAxisTicks(
	input: CartesianLayoutInput,
	band: BandScale,
	axisLength: number,
	slot: number,
	mode: ChartBandAxisMode,
	tilt = false,
): ChartAxisTick[] {
	if (mode === 'off') return []

	if (input.times) {
		const ticks = timeTicks({
			times: input.times,
			band,
			tickTarget: input.tickTarget,
			axisLength,
			locale: input.locale,
		})

		if (ticks) return ticks
	}

	if (mode === 'ends') return endBandTicks(input.categories, band)

	return bandTicksOf(input.categories, band, axisLength, slot, tilt)
}

/** One value axis's scale over its inputs, or `null` when nothing yields a domain. @internal */
function valueScaleOf(
	axis: ChartValueAxisInput | undefined,
	range: [number, number],
	tickTarget: number,
	zeroBaseline: boolean,
	headroom = 0,
): LinearScale | null {
	if (!axis) return null

	return linearScale({
		values: axis.domainValues,
		range,
		tickTarget,
		zeroBaseline,
		min: axis.min,
		max: axis.max,
		headroom,
	})
}

/** Both value scales resolved over one shared screen range. @internal */
type ValueScales = Record<ChartValueAxisId, LinearScale | null>

/**
 * A value axis's gutter: its tick labels plus, where titled, the title band and
 * a gap between the title and the labels. The gap keeps the two from crowding.
 * It is `0` with the axis off.
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

/**
 * Whether the asked value-label headroom is affordable over `rangePx` — `true`
 * when none was asked. The same {@link headroomFits} test {@link linearScale}
 * reserves by.
 *
 * @internal
 */
function labelRoomOf(headroom: number | undefined, rangePx: number): boolean {
	return !headroom || headroomFits(headroom, rangePx)
}

/**
 * The vertical layout's value-label room verdict. It gates on the range FLOOR —
 * the plot under the tallest band chrome this chart can wear — never on the
 * tier-resolved band. The actual range grows back when the band row drops at a
 * smaller tier. A verdict read from it flashes the labels back on mid-shrink
 * (hidden, shown, hidden again).
 *
 * The floor is computed from the props alone, the same posture as the tier's
 * chrome reserve. The verdict therefore moves one way as the frame shrinks. The
 * floor never exceeds the resolved range, so a granted verdict is always backed
 * by the scale's reservation.
 *
 * @internal
 */
function verticalLabelRoom(input: CartesianLayoutInput, flatRange: [number, number]): boolean {
	if (!input.valueHeadroom) return true

	const labelBand = input.tickRotation && !input.times ? TICK_ROTATION_HEIGHT : X_AXIS_HEIGHT

	// A titled band adds its title band under the labels, eating the same value room.
	const worstBand = labelBand + (input.bandTitle ? AXIS_TITLE_BAND : 0)

	// Without axes there is no band chrome to vary; the mark-inset range is
	// already monotone in the frame.
	const floor = input.axes
		? input.frameHeight - PLOT_TOP_PAD - worstBand
		: Math.abs(flatRange[0] - flatRange[1])

	return headroomFits(input.valueHeadroom, floor)
}

/**
 * The vertical layout's placed axis titles: a rotated title in each titled value
 * gutter. Where the band axis is titled, a horizontal one centers under its
 * labels, past the `bandLabelHeight` the labels occupy.
 *
 * @internal
 */
function verticalTitles(
	input: CartesianLayoutInput,
	scales: ValueScales,
	plot: PlotRect,
	frameWidth: number,
	bandTitle: string | undefined,
	bandLabelHeight: number,
): ChartAxisTitlePlacement[] {
	const titles: ChartAxisTitlePlacement[] = []

	const y = plot.y + plot.height / 2

	if (input.axes && scales.y && input.value?.title) {
		titles.push({ text: input.value.title, x: AXIS_TITLE_BAND / 2, y, rotate: -90 })
	}

	if (input.axes && scales.y2 && input.value2?.title) {
		titles.push({
			text: input.value2.title,
			x: frameWidth - AXIS_TITLE_BAND / 2,
			y,
			rotate: 90,
		})
	}

	if (bandTitle) {
		titles.push({
			text: bandTitle,
			x: plot.x + plot.width / 2,
			y: plot.y + plot.height + bandLabelHeight + AXIS_TITLE_BAND / 2,
			rotate: 0,
		})
	}

	return titles
}

/** One vertical layout's value scales and their formatted gutter ticks, against a resolved y-range. @internal */
type VerticalValueAxes = {
	valueScale: LinearScale | null
	value2Scale: LinearScale | null
	valueTicks: ChartAxisTick[]
	value2Ticks: ChartAxisTick[]
}

/**
 * Both value scales and their gutter tick labels for a vertical layout's
 * `range`. Split out of {@link verticalLayout} so it can resolve twice, without
 * duplicating the scale wiring inline. It resolves once against the flat x-axis
 * band, to size the gutters and probe whether the category labels fit. It
 * resolves again against a taller band, once tilting them wins the room back
 * instead.
 *
 * @internal
 */
function verticalValueAxes(
	input: CartesianLayoutInput,
	range: [number, number],
): VerticalValueAxes {
	const valueScale = valueScaleOf(
		input.value,
		range,
		input.tickTarget,
		input.zeroBaseline,
		input.valueHeadroom,
	)

	const value2Scale = valueScaleOf(
		input.value2,
		range,
		input.tickTarget,
		input.zeroBaseline,
		input.valueHeadroom,
	)

	const valueTicks = valueScale && input.value ? valueTicksOf(valueScale, input.value.format) : []

	const value2Ticks =
		value2Scale && input.value2 ? valueTicksOf(value2Scale, input.value2.format) : []

	return { valueScale, value2Scale, valueTicks, value2Ticks }
}

/**
 * The default layout: value on y with the scales filling the height above the
 * x-axis band, categories across x. The scales resolve from the frame height
 * first, so their tick labels can size the side gutters before the plot rect
 * exists. The right gutter appears only once a right scale resolves.
 *
 * Category labels that would collide at the flat band height either thin (the
 * default) or tilt, under {@link ChartCategoryAxis.tickRotation}. A tilt takes
 * the band-height decision, so the value scales resolve a second time against
 * the taller band once tilting wins.
 *
 * @internal
 */
export function verticalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, frameHeight, frameWidth } = input

	const bandMode = input.bandAxis ?? 'thinned'

	// The band row draws when a band is asked for; dropped, it still leaves a floor
	// pad so the value gutter's zero label clears the frame, and nothing at all
	// without axes.
	const drawBand = axes && bandMode !== 'off'

	// The band axis titles only when its labels draw; the title band adds under them.
	const bandTitle = drawBand ? input.bandTitle : undefined

	const titleBand = bandTitle ? AXIS_TITLE_BAND : 0

	const flatHeight = drawBand ? X_AXIS_HEIGHT + titleBand : axes ? FLOOR_LABEL_PAD : 0

	// Without the axis chrome the marks border the frame directly, so each edge
	// reserves the widest mark's painted reach instead — the floor takes it whole
	// where the band row would have been; the top pad already seats a marker, so
	// it only ever widens.
	const markPad = markPadOf(input)

	const flatRange: [number, number] = axes
		? [frameHeight - flatHeight, PLOT_TOP_PAD]
		: [frameHeight - markPad, Math.max(PLOT_TOP_PAD, markPad)]

	const valueLabelRoom = verticalLabelRoom(input, flatRange)

	// A withheld verdict reserves nothing — the scale would otherwise pad the
	// domain for labels that will not draw.
	const scaleInput = valueLabelRoom ? input : { ...input, valueHeadroom: 0 }

	const flatAxes = verticalValueAxes(scaleInput, flatRange)

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
		axes && flatAxes.value2Scale !== null,
		flatAxes.value2Ticks,
		input.value2?.title,
	)

	const plotWidth = Math.max(0, frameWidth - leftGutter - rightGutter)

	const longest = longestLength(categories)

	const slot = longest * TICK_CHAR_WIDTH + GUTTER_GAP

	// Tilting only applies to a drawn, thinned band: an ends band shows just two
	// labels, which never collide, and a dropped band has nothing to tilt. A time
	// axis lines calendar ticks in place of the labels tickRotation tilts, so
	// tilting would reserve the taller band for nothing — gate it out there too.
	const tilt =
		drawBand &&
		bandMode === 'thinned' &&
		Boolean(input.tickRotation) &&
		!input.times &&
		willThin(count, plotWidth, slot)

	const axisBandHeight = tilt ? TICK_ROTATION_HEIGHT + titleBand : flatHeight

	const { valueScale, value2Scale, valueTicks, value2Ticks } = tilt
		? verticalValueAxes(scaleInput, [frameHeight - axisBandHeight, PLOT_TOP_PAD])
		: flatAxes

	const plot: PlotRect = {
		x: leftGutter,
		y: PLOT_TOP_PAD,
		width: plotWidth,
		height: Math.max(0, frameHeight - PLOT_TOP_PAD - axisBandHeight),
	}

	const band = bandScale({
		count,
		range: markInsetRange(bandExtent('vertical', plot), bandPadOf(input)),
	})

	const scales: ValueScales = { y: valueScale, y2: value2Scale }

	const floor = plot.y + plot.height

	return {
		plot,
		valueScale,
		value2Scale,
		band,
		baseline: zeroOf(valueScale, value2Scale, floor),
		value2Baseline: zeroOf(value2Scale, valueScale, floor),
		valueTicks,
		value2Ticks,
		bandTicks: bandAxisTicks(input, band, plot.width, slot, bandMode, tilt),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(scales, count, input.visibleValues),
		snapSeries: snapSeriesOf(scales, count, input.visibleValues),
		titles: verticalTitles(
			input,
			scales,
			plot,
			frameWidth,
			bandTitle,
			tilt ? TICK_ROTATION_HEIGHT : X_AXIS_HEIGHT,
		),
		valueLabelRoom,
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
 * Insets a horizontal value axis's screen range so its end tick labels fit
 * inside the frame instead of overhanging it. Those labels draw centred on their
 * axis bands. The right end borders the frame edge, so it always reserves the
 * last label's half-width. The left end reserves the first label's only when the
 * category gutter can't already absorb it.
 *
 * With two axes each end takes the wider of the two labels. A frame too narrow
 * to seat both keeps the span, since a clipped label beats an inverted axis.
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

/**
 * The horizontal layout's placed axis titles: the value titles centered under
 * the bottom axis and over the top one. Where the band axis is titled, a rotated
 * one sits in the far-left gutter, past its labels.
 *
 * @internal
 */
function horizontalTitles(
	input: CartesianLayoutInput,
	scales: ValueScales,
	plot: PlotRect,
	bandTitle: string | undefined,
): ChartAxisTitlePlacement[] {
	const titles: ChartAxisTitlePlacement[] = []

	const x = plot.x + plot.width / 2

	if (input.axes && scales.y && input.value?.title) {
		titles.push({
			text: input.value.title,
			x,
			y: plot.y + plot.height + X_AXIS_HEIGHT + AXIS_TITLE_BAND / 2,
			rotate: 0,
		})
	}

	if (input.axes && scales.y2 && input.value2?.title) {
		titles.push({
			text: input.value2.title,
			x,
			y: plot.y - X_AXIS_HEIGHT - AXIS_TITLE_BAND / 2,
			rotate: 0,
		})
	}

	if (bandTitle) {
		titles.push({
			text: bandTitle,
			x: AXIS_TITLE_BAND / 2,
			y: plot.y + plot.height / 2,
			rotate: -90,
		})
	}

	return titles
}

/**
 * The band labels the horizontal left gutter sizes to: just the first and last
 * in an `'ends'` band, or every category otherwise. The `'ends'` case needs two
 * or more categories. The gutter therefore reserves only the width the drawn
 * labels need.
 *
 * @internal
 */
function shownBandLabels(categories: string[], mode: ChartBandAxisMode): string[] {
	if (mode === 'ends' && categories.length > 1) {
		return [categories[0] ?? '', categories.at(-1) ?? '']
	}

	return categories
}

/**
 * The horizontal layout's left gutter and its band title: the label gutter plus
 * a title band where the axis is titled. The label gutter is the widest drawn
 * band label, or none when the band is dropped. The title draws only when its
 * labels do, so the two resolve as one.
 *
 * @internal
 */
function horizontalBandGutter(
	input: CartesianLayoutInput,
	drawBand: boolean,
	bandMode: ChartBandAxisMode,
	categories: string[],
): { gutter: number; bandTitle: string | undefined } {
	const bandTitle = drawBand ? input.bandTitle : undefined

	const labels = drawBand ? tickGutter(shownBandLabels(categories, bandMode)) : 0

	return { gutter: labels + (bandTitle ? AXIS_TITLE_BAND + AXIS_TITLE_GAP : 0), bandTitle }
}

/**
 * The transposed layout: value on x with the scales filling the plot width,
 * categories down y. The band labels — not the value ticks — line the left
 * gutter, and they are known up front. The plot rect therefore resolves first,
 * and the value scales fill the width it leaves. They are inset so the end
 * labels clear the frame. The secondary axis's labels line a band above the
 * plot — the transpose of the vertical layout's right gutter — reserved only
 * once its probe resolves.
 *
 * @internal
 */
export function horizontalLayout(input: CartesianLayoutInput): CartesianLayout {
	const { axes, categories, count, frameHeight, frameWidth } = input

	const bandMode = input.bandAxis ?? 'thinned'

	// The band labels line the left gutter here; a dropped band frees it, an ends
	// band sizes it to just the first and last label. Its title, when set, rides a
	// rotated band past them at the far left — the transpose of the vertical value
	// title — so the gutter and the title resolve together.
	const drawBand = axes && bandMode !== 'off'

	const { gutter, bandTitle } = horizontalBandGutter(input, drawBand, bandMode, categories)

	const value2Probe = probeOf(input.value2, input.tickTarget, input.zeroBaseline)

	const bottomBand = axes ? X_AXIS_HEIGHT + (input.value?.title ? AXIS_TITLE_BAND : 0) : 0

	const topBand =
		axes && value2Probe ? X_AXIS_HEIGHT + (input.value2?.title ? AXIS_TITLE_BAND : 0) : 0

	const plot: PlotRect = {
		x: gutter,
		y: PLOT_TOP_PAD + topBand,
		width: Math.max(0, frameWidth - gutter),
		height: Math.max(0, frameHeight - PLOT_TOP_PAD - topBand - bottomBand),
	}

	const span = valueExtent('horizontal', plot)

	const valueProbe = probeOf(input.value, input.tickTarget, input.zeroBaseline)

	const probes = [valueProbe, value2Probe].filter((probe) => probe !== null)

	// Without the axis chrome the marks border the frame directly, so both layouts
	// reserve the widest mark's painted reach on every plot edge — here the value
	// axis runs across and the band down, the transpose of the vertical layout's.
	const markPad = markPadOf(input)

	// The value labels centre on their ticks, so without axes there is nothing to
	// reserve for and the scales fill the whole span, less the marks' own reach.
	const range = axes ? valueAxisRange(probes, span) : markInsetRange(span, markPad)

	const valueScale = valueScaleOf(
		input.value,
		range,
		input.tickTarget,
		input.zeroBaseline,
		input.valueHeadroom,
	)

	const value2Scale = valueScaleOf(
		input.value2,
		range,
		input.tickTarget,
		input.zeroBaseline,
		input.valueHeadroom,
	)

	const band = bandScale({
		count,
		range: markInsetRange(bandExtent('horizontal', plot), bandPadOf(input)),
	})

	const scales: ValueScales = { y: valueScale, y2: value2Scale }

	return {
		plot,
		valueScale,
		value2Scale,
		band,
		baseline: zeroOf(valueScale, value2Scale, plot.x),
		value2Baseline: zeroOf(value2Scale, valueScale, plot.x),
		valueTicks: valueScale && input.value ? valueTicksOf(valueScale, input.value.format) : [],
		value2Ticks: value2Scale && input.value2 ? valueTicksOf(value2Scale, input.value2.format) : [],
		bandTicks: bandAxisTicks(input, band, plot.height, BAND_LABEL_HEIGHT, bandMode),
		bandPositions: bandCenters(band, count),
		snapPoints: snapPointsOf(scales, count, input.visibleValues),
		snapSeries: snapSeriesOf(scales, count, input.visibleValues),
		titles: horizontalTitles(input, scales, plot, bandTitle),
		valueLabelRoom: labelRoomOf(input.valueHeadroom, Math.abs(range[1] - range[0])),
	}
}
