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
 * @remarks Non-finite entries are ignored when deriving the domain, so a stray
 * `NaN` doesn't collapse the whole series; a flat series (or one point) maps to
 * the vertical middle rather than dividing by a zero span. A single point draws
 * as a horizontal line across the box so it stays visible.
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

	const yAt = (value: number) => padding + (1 - norm(value)) * innerHeight

	const points = data.map((value, index) => ({ x: xAt(index), y: yAt(value) }))

	// One point can't form a segment; draw a flat line across the box so it reads.
	const line =
		points.length === 1
			? `M ${padding} ${points[0]?.y} L ${width - padding} ${points[0]?.y}`
			: `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`

	const first = points[0] as SparklinePoint

	const last = (points.at(-1) ?? null) as SparklinePoint | null

	const area = `${line} L ${last?.x ?? width - padding} ${baseline} L ${first.x} ${baseline} Z`

	const slot = data.length === 0 ? 0 : innerWidth / data.length

	const barWidth = Math.max(1, slot - barGap)

	const bars: SparklineBar[] = data.map((value, index) => {
		const barHeight = Math.max(minBarHeight, norm(value) * innerHeight)

		return {
			x: padding + index * slot + (slot - barWidth) / 2,
			y: baseline - barHeight,
			width: barWidth,
			height: barHeight,
		}
	})

	return { points, line, area, bars, last, baseline }
}
