/**
 * Pure geometry for the {@link LineChart}: multi-segment polylines that
 * break at non-finite values, their area washes, and the point markers.
 * Independent of React and styling so the mark math is unit-testable in
 * isolation.
 */

/** A resolved point on the line, in `viewBox` user units. @internal */
export type LinePoint = {
	x: number
	y: number
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
 * instead, so the datum stays visible as a marker even with markers off.
 * @internal
 */
export function lineGeometry(
	values: (number | null)[],
	xs: number[],
	map: (value: number) => number,
	baseline: number,
): LineSeriesGeometry {
	const pointRuns = runs(values, xs, map)

	const drawable = pointRuns.filter((run) => run.length > 1)

	const segments = drawable.map(
		(run) => `M ${run.map((point) => `${point.x} ${point.y}`).join(' L ')}`,
	)

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
