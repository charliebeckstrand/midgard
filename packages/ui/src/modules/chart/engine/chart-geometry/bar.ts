/**
 * Pure geometry for the {@link BarChart}: grouped bars as zero-baseline spans
 * rendered to one-end-rounded paths. It is independent of React and styling, so
 * the mark math is unit-testable in isolation. One slot-splitting pass serves both
 * orientations; only the path and the hit rect transpose, through
 * {@link barPath} and {@link barSpanFields}.
 */

import { BAR_END_RADIUS, BAR_MAX_WIDTH, MARK_GAP } from '../chart-constants'
import { coord } from '../chart-coords'
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
 * A bar path from `baseline` to `valuePos` along the value axis, over the slot
 * `c0`→`c1` of the band axis. `rounded` arcs the data end at
 * {@link endRadius} and leaves the baseline end square, as `rect` + `rx` cannot.
 * Without it both ends are square: an inner segment of a stack.
 *
 * One builder serves both orientations. The points run the same way in (value,
 * band) terms, and only the order of the two coordinates transposes. The
 * transpose flips the turn of the arcs, so the sweep reads the orientation too.
 * Each coordinate formats once.
 *
 * @internal
 */
function barPath(
	orientation: ChartOrientation,
	c0: number,
	c1: number,
	valuePos: number,
	baseline: number,
	rounded: boolean,
): string {
	const vertical = orientation === 'vertical'

	const b = coord(baseline)

	const v = coord(valuePos)

	const a0 = coord(c0)

	const a1 = coord(c1)

	if (!rounded) {
		return vertical
			? `M ${a0} ${b} L ${a0} ${v} L ${a1} ${v} L ${a1} ${b} Z`
			: `M ${b} ${a0} L ${v} ${a0} L ${v} ${a1} L ${b} ${a1} Z`
	}

	const radius = endRadius(valuePos, baseline, c1 - c0)

	const r = coord(radius)

	// The straight sides stop short of the data end by the radius, on the
	// baseline side of it.
	const s = coord(valuePos < baseline ? valuePos + radius : valuePos - radius)

	const n0 = coord(c0 + radius)

	const n1 = coord(c1 - radius)

	// A bar up (vertical) or to the right (horizontal) arcs clockwise; the
	// other way mirrors it.
	const sweep = (vertical ? valuePos < baseline : valuePos > baseline) ? 1 : 0

	return vertical
		? `M ${a0} ${b} L ${a0} ${s} A ${r} ${r} 0 0 ${sweep} ${n0} ${v} L ${n1} ${v} A ${r} ${r} 0 0 ${sweep} ${a1} ${s} L ${a1} ${b} Z`
		: `M ${b} ${a0} L ${s} ${a0} A ${r} ${r} 0 0 ${sweep} ${v} ${n0} L ${v} ${n1} A ${r} ${r} 0 0 ${sweep} ${s} ${a1} L ${b} ${a1} Z`
}

/**
 * A bar's hit-span fields — everything but the drawn path — from its value-axis
 * span (`baseline`→`valuePos`) and band-axis slot (`c0`→`c1`). Vertical runs the
 * span up y with the slot across x; horizontal transposes both, so
 * `barMarkAt` reads either the same way. A stacked segment keeps these full
 * edges while its path insets for the gap.
 *
 * @internal
 */
function barSpanFields(
	orientation: ChartOrientation,
	valuePos: number,
	baseline: number,
	c0: number,
	c1: number,
): Omit<BarMark, 'd'> {
	if (orientation === 'vertical') {
		return {
			x: c0,
			x1: c1,
			top: Math.min(valuePos, baseline),
			bottom: Math.max(valuePos, baseline),
			positive: valuePos < baseline,
		}
	}

	return {
		x: Math.min(valuePos, baseline),
		x1: Math.max(valuePos, baseline),
		top: c0,
		bottom: c1,
		positive: valuePos > baseline,
	}
}

/**
 * Projects series-major values onto grouped bar marks. Each category's band
 * splits into per-series bars capped at the spec thickness. They are separated
 * by the surface gap, and centered as a group in their band. The `map` receives
 * the series index beside the value, and `baseline` takes a per-series resolver.
 * A dual-axis chart therefore projects each series through its own scale. A
 * single-scale chart passes its scale's `map` and one number unchanged.
 *
 * @remarks A `null` value yields a `null` mark (an omitted bar, not a zero
 * one); an exact zero yields `null` too — the baseline already says zero.
 * `thick` lifts the {@link BAR_MAX_WIDTH} cap so the group fills the band split
 * by series and gaps, the leftover air turned to fill.
 * @internal
 */
export function barMarks(
	values: (number | null)[][],
	band: BandScale,
	map: (value: number, seriesIndex: number) => number,
	baseline: number | ((seriesIndex: number) => number),
	orientation: ChartOrientation = 'vertical',
	thick = false,
): (BarMark | null)[][] {
	const seriesCount = Math.max(1, values.length)

	const slot = (band.width - (seriesCount - 1) * MARK_GAP) / seriesCount

	const thickness = Math.max(1, thick ? slot : Math.min(BAR_MAX_WIDTH, slot))

	const group = seriesCount * thickness + (seriesCount - 1) * MARK_GAP

	const baselineOf = typeof baseline === 'number' ? () => baseline : baseline

	return values.map((series, seriesIndex) =>
		series.map((value, index) => {
			if (value === null || value === 0) return null

			const c0 = band.at(index) + (band.width - group) / 2 + seriesIndex * (thickness + MARK_GAP)

			const valuePos = map(value, seriesIndex)

			const seriesBaseline = baselineOf(seriesIndex)

			if (valuePos === seriesBaseline) return null

			const c1 = c0 + thickness

			return {
				...barSpanFields(orientation, valuePos, seriesBaseline, c0, c1),
				d: barPath(orientation, c0, c1, valuePos, seriesBaseline, true),
			}
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
}

/**
 * One stacked segment. Its hit span keeps the full running-total range, so the
 * column reads as one contiguous target. Its drawn path insets each shared edge
 * by half {@link MARK_GAP}, for the surface gap. The gap is dropped on a segment
 * too thin to hold it, rather than inverting.
 *
 * @internal
 */
function stackedSegment(orientation: ChartOrientation, segment: StackedSegment): BarMark {
	const { c0, thickness, baseEdge, dataEdge, hasBelow, rounded } = segment

	const c1 = c0 + thickness

	const gap = MARK_GAP / 2

	const toward = Math.sign(dataEdge - baseEdge)

	const insetTotal = (hasBelow ? gap : 0) + (rounded ? 0 : gap)

	const fits = Math.abs(dataEdge - baseEdge) > insetTotal + 1

	const pathBase = fits && hasBelow ? baseEdge + toward * gap : baseEdge

	const pathData = fits && !rounded ? dataEdge - toward * gap : dataEdge

	// The hit span keeps the full edges (a contiguous column); only the path insets.
	return {
		...barSpanFields(orientation, dataEdge, baseEdge, c0, c1),
		d: barPath(orientation, c0, c1, pathData, pathBase, rounded),
	}
}

/**
 * Projects series-major values onto one stacked column per category: segment
 * `s` spans `[sum(0..s-1), sum(0..s)]` on the value axis, all sharing the
 * band's centered full-width slot. The value scale is expected to be the
 * stacked (per-category sum) domain, so the column tops land inside the frame.
 *
 * @remarks Positive values only: a `null`, zero, or negative value takes no
 * segment, so each column reads as a part-to-whole total. The stacked
 * {@link AreaChart} differs: it adds a negative value to its running total.
 * Only the outermost segment keeps a rounded end; a {@link MARK_GAP} gap shows
 * the surface between the rest. `thick` lifts the {@link BAR_MAX_WIDTH}
 * cap so the column fills the whole band.
 * @internal
 */
export function stackedBarMarks(
	values: (number | null)[][],
	band: BandScale,
	map: (value: number) => number,
	orientation: ChartOrientation = 'vertical',
	thick = false,
): (BarMark | null)[][] {
	const count = values[0]?.length ?? 0

	const thickness = Math.max(1, thick ? band.width : Math.min(BAR_MAX_WIDTH, band.width))

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
			})
		}),
	)
}

/**
 * Per category, each stacked segment's cumulative top along the value axis,
 * piled bottom to top — the boundaries the drawn segments actually sit at — and
 * the series behind each stop in the same order. The from-zero snap points a
 * value scale maps coincide with the marks only in the grouped case, where the
 * bars grow from one shared baseline. A stack piles them, so the crosshair
 * snap and the keyboard cursor read these cumulative edges instead.
 *
 * Vertical reads the value off `top`, horizontal off `x1` — the segment's data
 * end either way, since stacked segments are positive-only. One pass builds
 * both lists, so a missing segment drops from each and the keyboard lane maps
 * back to the series it lands on. `seriesIndices[order]` names the series the
 * caller drew at stack position `order`.
 *
 * @internal
 */
export function stackedBarSnaps(
	marks: (BarMark | null)[][],
	seriesIndices: number[],
	count: number,
	orientation: ChartOrientation = 'vertical',
): { points: number[][]; series: number[][] } {
	const points = new Array<number[]>(count)

	const series = new Array<number[]>(count)

	for (let category = 0; category < count; category++) {
		const positions: number[] = []

		const owners: number[] = []

		for (const [order, seriesMarks] of marks.entries()) {
			const mark = seriesMarks[category]

			if (!mark) continue

			positions.push(orientation === 'vertical' ? mark.top : mark.x1)

			owners.push(seriesIndices[order] ?? order)
		}

		points[category] = positions

		series[category] = owners
	}

	return { points, series }
}
