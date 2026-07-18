/**
 * Pure geometry for the {@link Sparkline}: maps a numeric series onto an SVG
 * coordinate box, independent of React and styling so it can be unit-tested in
 * isolation. All outputs are in the same user-space units as the `viewBox` the
 * component renders.
 */

/** A resolved point in the sparkline's coordinate box. @internal */
export type SparklinePoint = { x: number; y: number }

/** One bar rectangle for the `bar` variant, in `viewBox` user units. @internal */
export type SparklineBar = { x: number; y: number; width: number; height: number }

/**
 * The resolved marks for one series: the polyline `points` and its `line`
 * path, the closed `area` path under it, the `bars` for the bar variant, the
 * `last` point (for the end-of-series marker), and the `baseline` y the area
 * and bars sit on. Empty paths and an empty `bars` array signal there is
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
	/** Domain floor; defaults to the series minimum. Values below it clamp to the baseline. */
	min?: number
	/** Domain ceiling; defaults to the series maximum. Values above it clamp to the top. */
	max?: number
}

/** Clamps `value` to the inclusive `[low, high]` range. @internal */
function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/**
 * Projects `data` onto an SVG coordinate box, returning the line, area, and bar
 * marks a {@link Sparkline} draws.
 *
 * @remarks Non-finite entries (`NaN`, `±Infinity`) are ignored both when deriving
 * the domain and when drawing the marks: the line bridges across a dropped sample
 * and its bar is omitted, rather than emitting an invalid path or a vertex clamped
 * to an edge. A flat series (or one point) maps to the vertical middle rather than
 * dividing by a zero span; a single point draws as a horizontal line across the
 * box so it stays visible.
 * @internal
 */
export function sparklineGeometry(
	data: number[],
	{ width, height, padding, barGap, minBarHeight = 1, min, max }: SparklineGeometryOptions,
): SparklineGeometry {
	const innerWidth = Math.max(0, width - padding * 2)

	const innerHeight = Math.max(0, height - padding * 2)

	const baseline = padding + innerHeight

	const empty: SparklineGeometry = {
		points: [],
		line: '',
		area: '',
		bars: [],
		last: null,
		baseline,
	}

	if (data.length === 0) return empty

	const finite = data.filter((value) => Number.isFinite(value))

	if (finite.length === 0) return empty

	const low = min ?? Math.min(...finite)

	const high = max ?? Math.max(...finite)

	const span = high - low

	// A flat series has no span to divide by; anchor every point to the middle.
	const norm = (value: number) => (span === 0 ? 0.5 : clamp((value - low) / span, 0, 1))

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

	const last = drawn.at(-1) ?? null

	// The drawn line always spans padding → width - padding (a lone point is forced
	// full-width; multi-point endpoints already land there), so close the area on
	// those edges rather than a point's own x — otherwise a single point fills as a
	// triangle apexing at its centre instead of a band.
	const area = `${line} L ${width - padding} ${baseline} L ${padding} ${baseline} Z`

	const slot = innerWidth / data.length

	const barWidth = Math.max(1, slot - barGap)

	// A plain loop: this runs on every render of a chart that lives in grid
	// cells, and a flatMap would allocate a throwaway wrapper array per datum.
	const bars: SparklineBar[] = []

	for (let index = 0; index < data.length; index++) {
		const value = data[index]

		if (value === undefined || !Number.isFinite(value)) continue

		const barHeight = Math.max(minBarHeight, norm(value) * innerHeight)

		bars.push({
			x: padding + index * slot + (slot - barWidth) / 2,
			y: baseline - barHeight,
			width: barWidth,
			height: barHeight,
		})
	}

	return { points, line, area, bars, last, baseline }
}
