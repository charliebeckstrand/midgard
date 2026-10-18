/**
 * Pure geometry for the {@link Sparkline}: maps a numeric series onto an SVG
 * coordinate box. It is independent of React and styling, so it can be
 * unit-tested in isolation. All outputs are in the same user-space units as the `viewBox` the
 * component renders.
 */

import { clamp } from '../../utilities'
import { reduceNumbers } from '../../utilities/aggregate'

/** A resolved point in the sparkline's coordinate box. @internal */
type SparklinePoint = { x: number; y: number }

/**
 * One bar rectangle for the `bar` variant, in `viewBox` user units. `index` is
 * the datum's position in the series: a stable key, geometry-free, so a longer
 * series never remounts the mark. A non-finite datum emits no bar, so `index`
 * is not the bar's own position in `bars`.
 *
 * @internal
 */
type SparklineBar = { index: number; x: number; y: number; width: number; height: number }

/**
 * The resolved marks for one series: the polyline `points` and its `line`
 * path, and the closed `area` path under it. It also holds the `bars` for the
 * bar variant, and the `last` point for the end-of-series marker. The
 * `baseline` y is the zero line, clamped into the domain: the area closes on
 * it, and the bars grow from it. Empty paths and an empty `bars` array signal there is
 * nothing to draw (no finite data).
 *
 * @internal
 */
export type SparklineGeometry = {
	points: SparklinePoint[]
	line: string
	area: string
	bars: SparklineBar[]
	last: SparklinePoint | null
	baseline: number
}

/** Options for {@link sparklineGeometry}. @internal */
export type SparklineGeometryOptions = {
	/** Coordinate-box width in user units (matches the `viewBox`). */
	width: number
	/** Coordinate-box height in user units. */
	height: number
	/** Inset from every edge, reserving room for the stroke width and the end-point marker. */
	padding: number
	/** Gap between adjacent bars in the `bar` variant. */
	barGap: number
	/** Floor for a bar's height so the minimum value still shows a sliver. @defaultValue 1 */
	minBarHeight?: number
	/** Domain floor; defaults to the series minimum. Values below it clamp to the bottom. */
	min?: number
	/** Domain ceiling; defaults to the series maximum. Values above it clamp to the top. */
	max?: number
}

/**
 * Projects `data` onto an SVG coordinate box, returning the line, area, and bar
 * marks a {@link Sparkline} draws.
 *
 * @remarks Non-finite entries (`NaN`, `±Infinity`) are ignored both when deriving
 * the domain and when drawing the marks. The line bridges across a dropped sample
 * and its bar is omitted. That beats emitting an invalid path or a vertex clamped
 * to an edge. A flat series (or one point) maps to the vertical middle rather than
 * dividing by a zero span. A series wholly below a pinned `min`, or above a
 * pinned `max`, clamps to the edge on its side. A single point draws as a
 * horizontal line across the box, so it stays visible, and its `last` point
 * sits at the end of that line.
 *
 * The area and the bars sit on zero, clamped into the domain. A domain that
 * crosses zero puts the zero line inside the box, so a negative value hangs
 * below it. A domain above zero sits on the bottom edge, and a domain below
 * zero hangs from the top edge. A flat domain takes the edge on the side of
 * zero.
 * @internal
 */
export function sparklineGeometry(
	data: number[],
	{ width, height, padding, barGap, minBarHeight = 1, min, max }: SparklineGeometryOptions,
): SparklineGeometry {
	const innerWidth = Math.max(0, width - padding * 2)

	const innerHeight = Math.max(0, height - padding * 2)

	const floor = padding + innerHeight

	const empty: SparklineGeometry = {
		points: [],
		line: '',
		area: '',
		bars: [],
		last: null,
		baseline: floor,
	}

	if (data.length === 0) return empty

	const finite = data.filter((value) => Number.isFinite(value))

	if (finite.length === 0) return empty

	// A pinned bound also bounds the derived one. Thus a series wholly past a
	// pinned bound gives a flat domain at that bound, not an inverted one. The
	// reduce does not spread the series as call arguments, so a long series
	// does not overflow the stack.
	const low = min ?? Math.min(reduceNumbers(finite, 'min'), max ?? Number.POSITIVE_INFINITY)

	const high = max ?? Math.max(reduceNumbers(finite, 'max'), min ?? Number.NEGATIVE_INFINITY)

	const span = high - low

	// A flat domain has no span to divide by. A value on it goes to the middle,
	// and a value past it clamps to the edge on its side.
	const norm = (value: number) =>
		span === 0 ? (value < low ? 0 : value > high ? 1 : 0.5) : clamp((value - low) / span, 0, 1)

	// Zero, clamped into the domain. The edge tests come first, so a flat
	// domain takes the edge on the side of zero and not its middle.
	const origin = low >= 0 ? 0 : high <= 0 ? 1 : norm(0)

	const baseline = padding + (1 - origin) * innerHeight

	const xAt = (index: number) =>
		data.length === 1
			? padding + innerWidth / 2
			: padding + (index / (data.length - 1)) * innerWidth

	// Non-finite input (NaN, ±Infinity) has no position on the scale — map it to
	// NaN so it drops out of the drawn marks below, rather than emitting an invalid
	// path token or (for ±Infinity, which `norm` would clamp) a vertex pinned to an
	// edge.
	const yAt = (value: number) =>
		Number.isFinite(value) ? padding + (1 - norm(value)) * innerHeight : Number.NaN

	const points = data.map((value, index) => ({ x: xAt(index), y: yAt(value) }))

	// Draw only the finite marks. `points` stays index-aligned for callers, but a
	// non-finite datum is excluded here — matching the non-finite skip in `bars`
	// below — so the line/area can't emit an invalid `L x NaN` token or a spurious
	// clamped vertex; the path bridges across the dropped sample.
	const drawn = points.filter((point) => Number.isFinite(point.y))

	// One point can't form a segment; draw a flat line across the box so it reads.
	const line =
		drawn.length === 1
			? `M ${padding} ${drawn[0]?.y} L ${width - padding} ${drawn[0]?.y}`
			: `M ${drawn.map((point) => `${point.x} ${point.y}`).join(' L ')}`

	const first = drawn[0]

	// A lone drawn point draws as a full-width line, so its end point sits at the
	// end of that line, not at the x of the datum.
	const last =
		drawn.length === 1 && first ? { x: width - padding, y: first.y } : (drawn.at(-1) ?? null)

	// Close the fill on the outermost drawn points, not the box corners: when a
	// boundary datum is non-finite the drawn line stops short of the edge, and
	// closing on the corner would paint a wedge with no line above it. A lone
	// drawn point is forced full-width (above), so it closes on the box edges to
	// read as a band rather than collapsing to a vertical line at its center.
	const area =
		first && last && drawn.length > 1
			? `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
			: `${line} L ${width - padding} ${baseline} L ${padding} ${baseline} Z`

	const bars = projectBars(data, {
		norm,
		origin,
		baseline,
		padding,
		floor,
		innerWidth,
		innerHeight,
		barGap,
		minBarHeight,
	})

	return { points, line, area, bars, last, baseline }
}

/** The scale that {@link projectBars} reads, resolved by {@link sparklineGeometry}. @internal */
type BarScale = {
	/** Maps a finite value to its fraction of the inner height. */
	norm: (value: number) => number
	/** The zero line, clamped into the domain, as a fraction of the inner height. */
	origin: number
	/** The y of the zero line. */
	baseline: number
	padding: number
	/** The y of the bottom edge of the inner box. */
	floor: number
	innerWidth: number
	innerHeight: number
	barGap: number
	minBarHeight: number
}

/**
 * Projects each finite datum onto a bar that grows from the zero line. A
 * negative value hangs below the line, and zero or more stands on it.
 * @internal
 */
function projectBars(
	data: number[],
	{
		norm,
		origin,
		baseline,
		padding,
		floor,
		innerWidth,
		innerHeight,
		barGap,
		minBarHeight,
	}: BarScale,
): SparklineBar[] {
	const slot = innerWidth / data.length

	const barWidth = Math.max(1, slot - barGap)

	// A plain loop: this runs on every render of a chart that lives in grid
	// cells, and a flatMap would allocate a throwaway wrapper array per datum.
	const bars: SparklineBar[] = []

	for (let index = 0; index < data.length; index++) {
		const value = data[index]

		if (value === undefined || !Number.isFinite(value)) continue

		const height = Math.max(minBarHeight, Math.abs(norm(value) - origin) * innerHeight)

		// The clamp keeps the floored sliver of a value outside a pinned domain
		// inside the box.
		const top = value < 0 ? baseline : baseline - height

		bars.push({
			index,
			x: padding + index * slot + (slot - barWidth) / 2,
			y: clamp(top, padding, floor - height),
			width: barWidth,
			height,
		})
	}

	return bars
}
