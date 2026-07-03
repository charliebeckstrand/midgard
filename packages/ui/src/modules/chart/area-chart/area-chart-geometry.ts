/**
 * Pure geometry for the stacked {@link AreaChart}: each series' band sits on
 * the running total below it, its top edge a line and its fill the ribbon down
 * to the previous series' top. Independent of React and styling so the math is
 * unit-testable in isolation. The unstacked variant reuses `lineGeometry`.
 */

import type { LinePoint } from '../line-chart/line-chart-geometry'

/** One stacked series' drawable marks. @internal */
export type StackedAreaGeometry = {
	/** The band's top edge, a line across its cumulative total. */
	line: string
	/** The filled ribbon between this top edge and the one below it. */
	area: string
	/** The top-edge points, for the opt-in markers. */
	points: LinePoint[]
}

/** Builds a polyline `d` from points. @internal */
function polyline(points: LinePoint[]): string {
	return `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`
}

/**
 * Stacks the series bottom-to-top: each category's value adds to the running
 * total, so band `s` spans `[sum(0..s-1), sum(0..s)]`. The stack starts at
 * zero, so `map` is expected to be a zero-baseline value scale.
 *
 * @remarks A non-finite value counts as zero so the stack stays continuous —
 * the band simply contributes no thickness at that category. Needs at least
 * two categories to form a ribbon; a single category yields empty paths.
 * @internal
 */
export function stackedAreas(
	seriesValues: (number | null)[][],
	xs: number[],
	map: (value: number) => number,
): StackedAreaGeometry[] {
	const count = xs.length

	const lower = new Array<number>(count).fill(0)

	return seriesValues.map((values) => {
		const upper = values.map((value, index) => (lower[index] ?? 0) + (value ?? 0))

		const topPoints = upper.map((value, index) => ({ x: xs[index] ?? 0, y: map(value) }))

		const bottomPoints = lower.map((value, index) => ({ x: xs[index] ?? 0, y: map(value) }))

		const drawable = count > 1

		const line = drawable ? polyline(topPoints) : ''

		// The top edge forward, then the lower edge back, closes the ribbon.
		const area = drawable
			? `${line} L ${[...bottomPoints]
					.reverse()
					.map((point) => `${point.x} ${point.y}`)
					.join(' L ')} Z`
			: ''

		for (let index = 0; index < count; index++) lower[index] = upper[index] ?? 0

		return { line, area, points: topPoints }
	})
}
