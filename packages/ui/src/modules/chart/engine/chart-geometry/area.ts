/**
 * Pure geometry for the stacked {@link AreaChart}: each series' band sits on
 * the running total below it. Its top edge is a line and its fill is the ribbon
 * down to the previous series' top. Independent of React and styling so the math is
 * unit-testable in isolation. The unstacked variant reuses `lineGeometry`.
 */

import { coord } from '../chart-coords'
import { decimateRun, type LinePoint, polylinePath } from './line'

/** One stacked series' drawable marks. @internal */
export type StackedAreaGeometry = {
	/** The band's top edge, a line across its cumulative total. */
	line: string
	/** The filled ribbon between this top edge and the one below it. */
	area: string
	/** The top-edge points, for the opt-in markers. */
	points: LinePoint[]
}

/**
 * Stacks the series bottom-to-top: each category's value adds to the running
 * total, so band `s` spans `[sum(0..s-1), sum(0..s)]`. The stack starts at
 * zero, so `map` is expected to be a zero-baseline value scale.
 *
 * @remarks A `null` value counts as zero so the stack stays continuous — the
 * band simply contributes no thickness at that category. Needs at least two
 * categories to form a ribbon; a single category yields empty paths.
 *
 * The drawn edges decimate as a line does ({@link decimateRun}), and `points`
 * stay at full resolution for the markers, labels, and hit test. The lower edge
 * of each ribbon is the drawn top edge of the ribbon below it, so the seam
 * between two ribbons is exact.
 * @internal
 */
export function stackedAreas(
	seriesValues: (number | null)[][],
	xs: number[],
	map: (value: number) => number,
): StackedAreaGeometry[] {
	const count = xs.length

	const totals = new Array<number>(count).fill(0)

	// The drawn top edge of the ribbon below; `null` under the first ribbon, which
	// closes on the zero line.
	let below: LinePoint[] | null = null

	return seriesValues.map((values) => {
		const points = new Array<LinePoint>(count)

		for (let index = 0; index < count; index++) {
			const total = (totals[index] as number) + (values[index] ?? 0)

			totals[index] = total

			points[index] = { x: xs[index] ?? 0, y: map(total) }
		}

		if (count < 2) return { line: '', area: '', points }

		const top = decimateRun(points)

		const line = polylinePath(top)

		// The top edge forward, then the lower edge back, closes the ribbon.
		let area = line

		if (below) {
			for (let index = below.length - 1; index >= 0; index--) {
				const point = below[index] as LinePoint

				area += ` L ${coord(point.x)} ${coord(point.y)}`
			}
		} else {
			const zero = coord(map(0))

			area += ` L ${coord((top.at(-1) as LinePoint).x)} ${zero} L ${coord((top[0] as LinePoint).x)} ${zero}`
		}

		below = top

		return { line, area: `${area} Z`, points }
	})
}
