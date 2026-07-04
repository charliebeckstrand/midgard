/**
 * Pure pointer hit tests for the cartesian marks: whether the pointer sits on
 * a bar, near a line, or inside an area fill. The hit layer feeds them into
 * the hover context so the tooltip shows only over data, while the hover
 * index — and any crosshair riding it — keeps tracking the whole plot.
 */

import type { BarMark } from './bar-chart/bar-chart-geometry'
import type { ChartOrientation } from './chart-orientation'
import type { LinePoint } from './line-chart/line-chart-geometry'

/**
 * How near the pointer must come to a line to count as on it, in px — a
 * generous catch so the tooltip is easy to summon by aim alone, without the
 * pixel precision a 2px stroke would otherwise demand. A snapping crosshair
 * bypasses this: it reads the nearest point anywhere in the plot.
 *
 * @internal
 */
export const LINE_HIT_TOLERANCE = 16

/** Slack above an area's top edge, so its own stroke counts as inside. @internal */
const AREA_EDGE_SLACK = 4

/**
 * Whether the pointer sits on any drawn bar, each bar's span widened by `gap`
 * along the band axis. Passing the inter-bar `MARK_GAP` closes the thin gaps
 * between a group's bars — each bar's slack reaches its neighbour's edge — so a
 * pointer sweeping across a group never falls between them and flickers the
 * tooltip, while the wider between-group padding stays uncovered and the readout
 * still clears when the pointer leaves the group (or off the value end of the
 * bars). The band axis is x when vertical and y when horizontal, so the slack
 * follows the orientation.
 *
 * @internal
 */
export function withinBarMarks(
	marks: (BarMark | null)[][],
	x: number,
	y: number,
	gap = 0,
	orientation: ChartOrientation = 'vertical',
): boolean {
	return marks.some((series) =>
		series.some((mark) => {
			if (mark === null) return false

			return orientation === 'vertical'
				? x >= mark.x - gap && x <= mark.x1 + gap && y >= mark.top && y <= mark.bottom
				: x >= mark.x && x <= mark.x1 && y >= mark.top - gap && y <= mark.bottom + gap
		}),
	)
}

/** Squared distance from the pointer to the segment `a`→`b`. @internal */
function segmentDistanceSquared(x: number, y: number, a: LinePoint, b: LinePoint): number {
	const dx = b.x - a.x

	const dy = b.y - a.y

	const lengthSquared = dx * dx + dy * dy

	const t =
		lengthSquared === 0
			? 0
			: Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared))

	const px = a.x + t * dx - x

	const py = a.y + t * dy - y

	return px * px + py * py
}

/** Whether one run's polyline (or lone point) passes within `limit`² of the pointer. @internal */
function nearRun(run: LinePoint[], x: number, y: number, limit: number): boolean {
	if (run.length === 1) {
		const only = run[0] as LinePoint

		return segmentDistanceSquared(x, y, only, only) <= limit
	}

	for (let i = 0; i < run.length - 1; i++) {
		if (segmentDistanceSquared(x, y, run[i] as LinePoint, run[i + 1] as LinePoint) <= limit) {
			return true
		}
	}

	return false
}

/**
 * Whether the pointer is within `tolerance` of any series' line. Each series
 * brings its gap-split runs, so the test never bridges a gap; a smooth curve
 * is tested against its chords, which the tolerance comfortably covers.
 *
 * @internal
 */
export function nearSeriesLines(
	seriesRuns: LinePoint[][][],
	x: number,
	y: number,
	tolerance: number = LINE_HIT_TOLERANCE,
): boolean {
	const limit = tolerance * tolerance

	return seriesRuns.some((runs) => runs.some((run) => nearRun(run, x, y, limit)))
}

/** The run's top-edge y at `x` by chord interpolation, or `null` where the run doesn't cover `x`. @internal */
function topEdgeY(run: LinePoint[], x: number): number | null {
	for (let i = 0; i < run.length - 1; i++) {
		const a = run[i] as LinePoint

		const b = run[i + 1] as LinePoint

		if (x < a.x || x > b.x) continue

		const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x)

		return a.y + t * (b.y - a.y)
	}

	return null
}

/**
 * Whether the pointer sits inside any series' fill: under its top edge (with
 * a little slack for the stroke) and above the baseline. Overlapping and
 * stacked fills alike tile the space up to the highest covering edge, so one
 * union test serves both.
 *
 * @internal
 */
export function withinSeriesAreas(
	seriesRuns: LinePoint[][][],
	baseline: number,
	x: number,
	y: number,
): boolean {
	return seriesRuns.some((runs) =>
		runs.some((run) => {
			const top = topEdgeY(run, x)

			return top !== null && y >= top - AREA_EDGE_SLACK && y <= baseline
		}),
	)
}
