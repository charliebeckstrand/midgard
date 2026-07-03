/**
 * Pure geometry for the {@link LineChart}: multi-segment polylines that
 * break at non-finite values, their area washes, and the point markers.
 * Independent of React and styling so the mark math is unit-testable in
 * isolation.
 */

/** How a line connects its points: straight or a rounded monotone curve. */
export type LineInterpolation = 'linear' | 'smooth'

/** A resolved point on the line, in `viewBox` user units. @internal */
export type LinePoint = {
	x: number
	y: number
}

/**
 * Monotone cubic tangents (Fritsch–Carlson) for the run's y values: the
 * per-point slopes a smooth curve follows, clamped so the interpolation never
 * overshoots the data — a curve between two rising points can't dip.
 *
 * @internal
 */
function monotoneTangents(run: LinePoint[]): number[] {
	const n = run.length

	const slopes = Array.from({ length: n - 1 }, (_, i) => {
		const dx = (run[i + 1] as LinePoint).x - (run[i] as LinePoint).x

		return dx === 0 ? 0 : ((run[i + 1] as LinePoint).y - (run[i] as LinePoint).y) / dx
	})

	const tangents = run.map((_, i) => {
		if (i === 0) return slopes[0] ?? 0

		if (i === n - 1) return slopes[n - 2] ?? 0

		const prev = slopes[i - 1] as number

		const next = slopes[i] as number

		// A sign change (a local extremum) flattens the tangent to zero.
		return prev * next <= 0 ? 0 : (prev + next) / 2
	})

	// Fritsch–Carlson clamp: keep each tangent inside the monotone circle so
	// the cubic stays within the neighbouring data values.
	for (let i = 0; i < n - 1; i++) {
		const slope = slopes[i] as number

		if (slope === 0) {
			tangents[i] = 0

			tangents[i + 1] = 0

			continue
		}

		const a = (tangents[i] as number) / slope

		const b = (tangents[i + 1] as number) / slope

		const h = a * a + b * b

		if (h > 9) {
			const t = 3 / Math.sqrt(h)

			tangents[i] = t * a * slope

			tangents[i + 1] = t * b * slope
		}
	}

	return tangents
}

/** The path for one contiguous run, straight or smoothed. @internal */
function segmentPath(run: LinePoint[], interpolation: LineInterpolation): string {
	const start = run[0] as LinePoint

	if (interpolation === 'linear' || run.length < 3) {
		return `M ${run.map((point) => `${point.x} ${point.y}`).join(' L ')}`
	}

	const tangents = monotoneTangents(run)

	let d = `M ${start.x} ${start.y}`

	for (let i = 0; i < run.length - 1; i++) {
		const p0 = run[i] as LinePoint

		const p1 = run[i + 1] as LinePoint

		const dx = (p1.x - p0.x) / 3

		const c1x = p0.x + dx

		const c1y = p0.y + (tangents[i] as number) * dx

		const c2x = p1.x - dx

		const c2y = p1.y - (tangents[i + 1] as number) * dx

		d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p1.x} ${p1.y}`
	}

	return d
}

/** One series' drawable marks. @internal */
export type LineSeriesGeometry = {
	/** One open path per contiguous run of values — a gap starts a new segment. */
	segments: string[]
	/** The wash under each segment, closed down to the baseline. */
	areas: string[]
	/** Every plotted point, for the opt-in markers. */
	points: LinePoint[]
	/** Points with a gap on both sides — invisible without a marker, so they always get one. */
	isolated: LinePoint[]
}

/** Splits the values into contiguous non-null runs of plotted points. @internal */
function runs(values: (number | null)[], xs: number[], map: (value: number) => number) {
	const out: LinePoint[][] = []

	let current: LinePoint[] = []

	values.forEach((value, index) => {
		const x = xs[index]

		if (value === null || x === undefined) {
			if (current.length > 0) out.push(current)

			current = []

			return
		}

		current.push({ x, y: map(value) })
	})

	if (current.length > 0) out.push(current)

	return out
}

/**
 * Projects one series onto its line marks: segment paths between gaps, area
 * washes closed to `baseline`, and the point markers.
 *
 * @remarks A run of one point yields no segment — it lands in `isolated`
 * instead, so the datum stays visible as a marker even with markers off. With
 * `interpolation: 'smooth'` the segments (and the area's top edge) follow a
 * monotone cubic that never overshoots the data.
 * @internal
 */
export function lineGeometry(
	values: (number | null)[],
	xs: number[],
	map: (value: number) => number,
	baseline: number,
	interpolation: LineInterpolation = 'linear',
): LineSeriesGeometry {
	const pointRuns = runs(values, xs, map)

	const drawable = pointRuns.filter((run) => run.length > 1)

	const segments = drawable.map((run) => segmentPath(run, interpolation))

	const areas = drawable.map((run, index) => {
		const first = run[0] as LinePoint

		const last = run.at(-1) as LinePoint

		return `${segments[index]} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
	})

	return {
		segments,
		areas,
		points: pointRuns.flat(),
		isolated: pointRuns.filter((run) => run.length === 1).flat(),
	}
}
