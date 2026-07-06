/**
 * Pure geometry for the {@link BarChart}: grouped bars as zero-baseline spans
 * rendered to one-end-rounded paths, independent of React and styling so the
 * mark math is unit-testable in isolation. One slot-splitting pass serves both
 * orientations; only the path and the hit rect transpose, through
 * {@link barSpan}.
 */

import { BAR_END_RADIUS, BAR_MAX_WIDTH, MARK_GAP } from '../chart-constants'
import type { ChartOrientation } from '../chart-orientation'
import type { BandScale } from '../chart-scale'

/** One drawable bar: its path, hit rect, and the animation facts about it. @internal */
export type BarMark = {
	/** One-end-rounded path: a 4px arc on the data end, square at the baseline. */
	d: string
	/** The bar's left edge, in `viewBox` units. */
	x: number
	/** The bar's right edge. */
	x1: number
	/** The drawn span's lesser y — the data end above the baseline, or the baseline. */
	top: number
	/** The drawn span's greater y. */
	bottom: number
	/** Stable series-and-category key: geometry-free, so a resize never remounts the mark. */
	key: string
	/** Whether the bar's data end sits past the baseline on the positive side — up, or to the right. */
	positive: boolean
}

/**
 * The bar's rounded-end radius, clamped to its own length and half-thickness so
 * a short or thin bar never inverts.
 *
 * @internal
 */
function endRadius(valuePos: number, baseline: number, thickness: number): number {
	return Math.min(BAR_END_RADIUS, Math.abs(baseline - valuePos), thickness / 2)
}

/**
 * The rounded-end bar path from `baseline` to `valueY`, thickness `x0`→`x1`.
 * `rect` + `rx` is off-spec here — it would round the baseline end too.
 *
 * @internal
 */
function verticalBarPath(x0: number, x1: number, valueY: number, baseline: number): string {
	const radius = endRadius(valueY, baseline, x1 - x0)

	if (valueY < baseline) {
		const shoulder = valueY + radius

		return [
			`M ${x0} ${baseline}`,
			`L ${x0} ${shoulder}`,
			`A ${radius} ${radius} 0 0 1 ${x0 + radius} ${valueY}`,
			`L ${x1 - radius} ${valueY}`,
			`A ${radius} ${radius} 0 0 1 ${x1} ${shoulder}`,
			`L ${x1} ${baseline}`,
			'Z',
		].join(' ')
	}

	const shoulder = valueY - radius

	return [
		`M ${x0} ${baseline}`,
		`L ${x0} ${shoulder}`,
		`A ${radius} ${radius} 0 0 0 ${x0 + radius} ${valueY}`,
		`L ${x1 - radius} ${valueY}`,
		`A ${radius} ${radius} 0 0 0 ${x1} ${shoulder}`,
		`L ${x1} ${baseline}`,
		'Z',
	].join(' ')
}

/**
 * The vertical path's transpose: the span runs along x from `baseline` to
 * `valueX`, thickness `y0`→`y1`, rounded at the `valueX` data end.
 *
 * @internal
 */
function horizontalBarPath(y0: number, y1: number, valueX: number, baseline: number): string {
	const radius = endRadius(valueX, baseline, y1 - y0)

	if (valueX > baseline) {
		const shoulder = valueX - radius

		return [
			`M ${baseline} ${y0}`,
			`L ${shoulder} ${y0}`,
			`A ${radius} ${radius} 0 0 1 ${valueX} ${y0 + radius}`,
			`L ${valueX} ${y1 - radius}`,
			`A ${radius} ${radius} 0 0 1 ${shoulder} ${y1}`,
			`L ${baseline} ${y1}`,
			'Z',
		].join(' ')
	}

	const shoulder = valueX + radius

	return [
		`M ${baseline} ${y0}`,
		`L ${shoulder} ${y0}`,
		`A ${radius} ${radius} 0 0 0 ${valueX} ${y0 + radius}`,
		`L ${valueX} ${y1 - radius}`,
		`A ${radius} ${radius} 0 0 0 ${shoulder} ${y1}`,
		`L ${baseline} ${y1}`,
		'Z',
	].join(' ')
}

/**
 * One bar from its value-axis span (`baseline`→`valuePos`) and its band-axis
 * slot (`c0`→`c1`). Vertical draws the span up y with the slot across x;
 * horizontal transposes both, and the hit rect follows so `withinBarMarks`
 * reads either the same way.
 *
 * @internal
 */
function barSpan(
	orientation: ChartOrientation,
	valuePos: number,
	baseline: number,
	c0: number,
	c1: number,
	key: string,
): BarMark {
	if (orientation === 'vertical') {
		return {
			d: verticalBarPath(c0, c1, valuePos, baseline),
			x: c0,
			x1: c1,
			top: Math.min(valuePos, baseline),
			bottom: Math.max(valuePos, baseline),
			key,
			positive: valuePos < baseline,
		}
	}

	return {
		d: horizontalBarPath(c0, c1, valuePos, baseline),
		x: Math.min(valuePos, baseline),
		x1: Math.max(valuePos, baseline),
		top: c0,
		bottom: c1,
		key,
		positive: valuePos > baseline,
	}
}

/**
 * A both-ends-square vertical span from `baseline` to `valueY`, thickness
 * `x0`→`x1` — an inner stacked segment, rounded at neither end.
 *
 * @internal
 */
function verticalSquarePath(x0: number, x1: number, valueY: number, baseline: number): string {
	return `M ${x0} ${baseline} L ${x0} ${valueY} L ${x1} ${valueY} L ${x1} ${baseline} Z`
}

/** The vertical square path's transpose: the span runs along x. @internal */
function horizontalSquarePath(y0: number, y1: number, valueX: number, baseline: number): string {
	return `M ${baseline} ${y0} L ${valueX} ${y0} L ${valueX} ${y1} L ${baseline} ${y1} Z`
}

/**
 * One stacked segment's path from its `baseEdge`→`dataEdge` value span and its
 * band slot `c0`→`c1`: rounded at the data end only when it is the outermost
 * segment, square at both ends within the stack.
 *
 * @internal
 */
function stackSegmentPath(
	orientation: ChartOrientation,
	c0: number,
	c1: number,
	dataEdge: number,
	baseEdge: number,
	rounded: boolean,
): string {
	if (orientation === 'vertical') {
		return rounded
			? verticalBarPath(c0, c1, dataEdge, baseEdge)
			: verticalSquarePath(c0, c1, dataEdge, baseEdge)
	}

	return rounded
		? horizontalBarPath(c0, c1, dataEdge, baseEdge)
		: horizontalSquarePath(c0, c1, dataEdge, baseEdge)
}

/**
 * Projects series-major values onto grouped bar marks: each category's band
 * splits into per-series bars capped at the spec thickness, separated by the
 * surface gap, and centered as a group in their band. `map` receives the
 * series index beside the value, and `baseline` takes a per-series resolver,
 * so a dual-axis chart projects each series through its own scale; a
 * single-scale chart passes its scale's `map` and one number unchanged.
 *
 * @remarks A `null` value yields a `null` mark (an omitted bar, not a zero
 * one); an exact zero yields `null` too — the baseline already says zero.
 * @internal
 */
export function barMarks(
	values: (number | null)[][],
	band: BandScale,
	map: (value: number, seriesIndex: number) => number,
	baseline: number | ((seriesIndex: number) => number),
	orientation: ChartOrientation = 'vertical',
): (BarMark | null)[][] {
	const seriesCount = Math.max(1, values.length)

	const thickness = Math.max(
		1,
		Math.min(BAR_MAX_WIDTH, (band.width - (seriesCount - 1) * MARK_GAP) / seriesCount),
	)

	const group = seriesCount * thickness + (seriesCount - 1) * MARK_GAP

	const baselineOf = typeof baseline === 'number' ? () => baseline : baseline

	return values.map((series, seriesIndex) =>
		series.map((value, index) => {
			if (value === null || value === 0) return null

			const c0 = band.at(index) + (band.width - group) / 2 + seriesIndex * (thickness + MARK_GAP)

			const valuePos = map(value, seriesIndex)

			const seriesBaseline = baselineOf(seriesIndex)

			if (valuePos === seriesBaseline) return null

			return barSpan(
				orientation,
				valuePos,
				seriesBaseline,
				c0,
				c0 + thickness,
				`${seriesIndex}:${index}`,
			)
		}),
	)
}

/** The topmost series drawing a positive segment in each category — the only one rounded. @internal */
function topmostSeries(values: (number | null)[][], count: number): number[] {
	const top = new Array<number>(count).fill(-1)

	values.forEach((series, seriesIndex) => {
		series.forEach((value, index) => {
			if (value !== null && Number.isFinite(value) && value > 0) top[index] = seriesIndex
		})
	})

	return top
}

/** One stacked segment's resolved placement, from {@link stackedBarMarks}. @internal */
type StackedSegment = {
	c0: number
	thickness: number
	/** Value-axis coord of the segment's baseline edge — its running-total floor. */
	baseEdge: number
	/** Value-axis coord of the segment's data edge — its cumulative top. */
	dataEdge: number
	/** Whether a segment sits below, so the shared baseline edge insets for the gap. */
	hasBelow: boolean
	/** Whether this is the outermost segment — its data end rounds and stays flush. */
	rounded: boolean
	key: string
}

/**
 * One stacked segment: its hit span keeps the full running-total range so the
 * column reads as one contiguous target, while its drawn path insets each
 * shared edge by half {@link MARK_GAP} for the surface gap — the gap dropped on
 * a segment too thin to hold it, rather than inverting.
 *
 * @internal
 */
function stackedSegment(orientation: ChartOrientation, segment: StackedSegment): BarMark {
	const { c0, thickness, baseEdge, dataEdge, hasBelow, rounded, key } = segment

	const c1 = c0 + thickness

	const gap = MARK_GAP / 2

	const toward = Math.sign(dataEdge - baseEdge)

	const insetTotal = (hasBelow ? gap : 0) + (rounded ? 0 : gap)

	const fits = Math.abs(dataEdge - baseEdge) > insetTotal + 1

	const pathBase = fits && hasBelow ? baseEdge + toward * gap : baseEdge

	const pathData = fits && !rounded ? dataEdge - toward * gap : dataEdge

	// The hit span keeps the full edges (a contiguous column); only the path insets.
	const mark = barSpan(orientation, dataEdge, baseEdge, c0, c1, key)

	return { ...mark, d: stackSegmentPath(orientation, c0, c1, pathData, pathBase, rounded) }
}

/**
 * Projects series-major values onto one stacked column per category: segment
 * `s` spans `[sum(0..s-1), sum(0..s)]` on the value axis, all sharing the
 * band's centered full-width slot. The value scale is expected to be the
 * stacked (per-category sum) domain, so the column tops land inside the frame.
 *
 * @remarks Positive values only for now: a `null`, zero, or negative value
 * takes no segment, matching the stacked {@link AreaChart}'s part-to-whole
 * reading. Only the outermost segment keeps a rounded end; a {@link MARK_GAP}
 * gap shows the surface between the rest.
 * @internal
 */
export function stackedBarMarks(
	values: (number | null)[][],
	band: BandScale,
	map: (value: number) => number,
	orientation: ChartOrientation = 'vertical',
): (BarMark | null)[][] {
	const count = values[0]?.length ?? 0

	const thickness = Math.max(1, Math.min(BAR_MAX_WIDTH, band.width))

	const lower = new Array<number>(count).fill(0)

	const outermost = topmostSeries(values, count)

	return values.map((series, seriesIndex) =>
		series.map((value, index) => {
			if (value === null || !Number.isFinite(value) || value <= 0) return null

			const lo = lower[index] ?? 0

			const hi = lo + value

			lower[index] = hi

			return stackedSegment(orientation, {
				c0: band.at(index) + (band.width - thickness) / 2,
				thickness,
				baseEdge: map(lo),
				dataEdge: map(hi),
				hasBelow: lo > 0,
				rounded: seriesIndex === outermost[index],
				key: `${seriesIndex}:${index}`,
			})
		}),
	)
}

/**
 * Per category, each stacked segment's cumulative top along the value axis,
 * piled bottom to top — the boundaries the drawn segments actually sit at. The
 * from-zero snap points a value scale maps only coincide with the marks when the
 * bars grow from one shared baseline (grouped); a stack piles them, so the
 * crosshair snap and keyboard cursor read these cumulative edges instead.
 * Vertical reads the value off `top`, horizontal off `x1` — the segment's data
 * end either way, since stacked segments are positive-only.
 *
 * @internal
 */
export function stackedBarSnapPoints(
	marks: (BarMark | null)[][],
	count: number,
	orientation: ChartOrientation = 'vertical',
): number[][] {
	return Array.from({ length: count }, (_, category) =>
		marks.reduce<number[]>((positions, series) => {
			const mark = series[category]

			if (mark) positions.push(orientation === 'vertical' ? mark.top : mark.x1)

			return positions
		}, []),
	)
}

/**
 * The series index behind each {@link stackedBarSnapPoints} stop, in the same
 * order and dropped by the same non-null gate, so the keyboard cursor's value
 * lane resolves to the series whose segment it lands on. `seriesIndices[order]`
 * names the series the caller drew at stack position `order`.
 *
 * @internal
 */
export function stackedBarSnapSeries(
	marks: (BarMark | null)[][],
	seriesIndices: number[],
	count: number,
): number[][] {
	return Array.from({ length: count }, (_, category) =>
		marks.reduce<number[]>((series, seriesMarks, order) => {
			const index = seriesIndices[order]

			if (seriesMarks[category] && index !== undefined) series.push(index)

			return series
		}, []),
	)
}
