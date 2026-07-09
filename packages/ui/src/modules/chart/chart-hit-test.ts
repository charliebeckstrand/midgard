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
 * generous catch so the tooltip is easy to summon and the line easy to isolate
 * by aim alone, without the pixel precision a 2px stroke would otherwise
 * demand. A snapping crosshair bypasses this: it reads the nearest point
 * anywhere in the plot.
 *
 * @internal
 */
export const LINE_HIT_TOLERANCE = 16

/** Slack above an area's top edge, so its own stroke counts as inside. @internal */
const AREA_EDGE_SLACK = 4

/**
 * How decisively a challenger must out-close the held mark to take the
 * emphasis within overlapping catches: to under half its distance. Nearest-mark
 * resolution alone flips at the exact midline between two close marks — a knife
 * edge — so the mark already emphasised holds until the pointer commits to
 * another, turning the flip point into a deadband.
 *
 * @internal
 */
export const MARK_HOLD_RATIO = 0.5

/**
 * Whether a challenger at `challengerSquared` decisively beats a held mark at
 * `heldSquared` — closer than {@link MARK_HOLD_RATIO} of its distance.
 *
 * @internal
 */
export function beatsHeldMark(challengerSquared: number, heldSquared: number): boolean {
	return challengerSquared < heldSquared * (MARK_HOLD_RATIO * MARK_HOLD_RATIO)
}

/** Whether the pointer sits inside one bar's span, its band axis widened by `gap`. @internal */
function withinBar(
	mark: BarMark,
	x: number,
	y: number,
	gap: number,
	orientation: ChartOrientation,
) {
	return orientation === 'vertical'
		? x >= mark.x - gap && x <= mark.x1 + gap && y >= mark.top && y <= mark.bottom
		: x >= mark.x && x <= mark.x1 && y >= mark.top - gap && y <= mark.bottom + gap
}

/**
 * The bar the pointer sits on — its series and datum indices — or `null` off
 * every bar. A bar's own body wins first, so the pointer isolates the bar it
 * truly covers; only where no body catches it does the widened `gap` pass close
 * the thin gaps between a group's bars, each bar's slack reaching its
 * neighbour's edge, so a pointer sweeping across a group never falls between
 * them and flickers the tooltip while the wider between-group padding stays
 * uncovered. The band axis is x when vertical and y when horizontal, so the
 * slack follows the orientation.
 *
 * @internal
 */
export function barMarkAt(
	marks: (BarMark | null)[][],
	x: number,
	y: number,
	gap = 0,
	orientation: ChartOrientation = 'vertical',
): { series: number; datum: number } | null {
	// Two passes: the exact bodies first so a hovered bar isolates itself rather
	// than a gap-widened neighbour, then the widened spans to bridge the gaps.
	for (const slack of gap > 0 ? [0, gap] : [0]) {
		for (let series = 0; series < marks.length; series++) {
			const row = marks[series] as (BarMark | null)[]

			for (let datum = 0; datum < row.length; datum++) {
				const mark = row[datum]

				if (mark != null && withinBar(mark, x, y, slack, orientation)) return { series, datum }
			}
		}
	}

	return null
}

/**
 * Whether the pointer sits on any drawn bar — the tooltip's gate, resolved
 * through {@link barMarkAt} so the hit test and the mark isolation read one
 * geometry.
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
	return barMarkAt(marks, x, y, gap, orientation) !== null
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

/** The least squared distance from the pointer to one run's polyline (or lone point). @internal */
function runDistanceSquared(run: LinePoint[], x: number, y: number): number {
	if (run.length === 1) {
		const only = run[0] as LinePoint

		return segmentDistanceSquared(x, y, only, only)
	}

	let best = Number.POSITIVE_INFINITY

	for (let i = 0; i < run.length - 1; i++) {
		best = Math.min(
			best,
			segmentDistanceSquared(x, y, run[i] as LinePoint, run[i + 1] as LinePoint),
		)
	}

	return best
}

/**
 * The series whose line runs nearest the pointer, within `tolerance`, or `null`
 * off every line. The nearest wins where two overlap, so the isolation lifts
 * the line the pointer truly follows rather than whichever drew first. A `held`
 * series — the one already emphasised — keeps the win while it stays within the
 * catch, unless a challenger {@link beatsHeldMark | decisively} closes: the
 * resolution is sticky across the midline between two close strokes rather than
 * flipping on the knife edge. Each series brings its gap-split runs, so the
 * test never bridges a gap; a smooth curve is tested against its chords, which
 * the tolerance comfortably covers.
 *
 * @internal
 */
export function nearestSeriesLine(
	seriesRuns: LinePoint[][][],
	x: number,
	y: number,
	tolerance: number = LINE_HIT_TOLERANCE,
	held: number | null = null,
): number | null {
	let best: { series: number; distanceSquared: number } | null = null

	let bestDistance = tolerance * tolerance

	let heldDistance = Number.POSITIVE_INFINITY

	for (let series = 0; series < seriesRuns.length; series++) {
		for (const run of seriesRuns[series] as LinePoint[][]) {
			const distance = runDistanceSquared(run, x, y)

			if (series === held) heldDistance = Math.min(heldDistance, distance)

			if (distance <= bestDistance) {
				bestDistance = distance

				best = { series, distanceSquared: distance }
			}
		}
	}

	// The held series keeps the emphasis while it remains within the catch and
	// no challenger decisively out-closes it.
	if (
		best !== null &&
		held !== null &&
		best.series !== held &&
		heldDistance <= tolerance * tolerance &&
		!beatsHeldMark(best.distanceSquared, heldDistance)
	) {
		return held
	}

	return best?.series ?? null
}

/**
 * Whether the pointer is within `tolerance` of any series' line — the tooltip's
 * gate, resolved through {@link nearestSeriesLine} so the hit test and the mark
 * isolation read one geometry.
 *
 * @internal
 */
export function nearSeriesLines(
	seriesRuns: LinePoint[][][],
	x: number,
	y: number,
	tolerance: number = LINE_HIT_TOLERANCE,
): boolean {
	return nearestSeriesLine(seriesRuns, x, y, tolerance) !== null
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
 * The series whose fill the pointer sits in, or `null` outside every fill: under
 * a top edge (with a little slack for the stroke) and above the baseline. Where
 * fills overlap — stacked ribbons especially, each covering to the baseline — the
 * one whose top edge sits nearest above the pointer wins, so the isolation lifts
 * the ribbon the pointer is actually inside rather than every ribbon beneath it.
 *
 * @internal
 */
export function nearestSeriesArea(
	seriesRuns: LinePoint[][][],
	baseline: number,
	x: number,
	y: number,
): number | null {
	let best: number | null = null

	let bestTop = Number.NEGATIVE_INFINITY

	for (let series = 0; series < seriesRuns.length; series++) {
		for (const run of seriesRuns[series] as LinePoint[][]) {
			const top = topEdgeY(run, x)

			// The nearest covering top is the greatest one still above the pointer —
			// the ribbon whose upper edge the pointer sits just under.
			if (top !== null && y >= top - AREA_EDGE_SLACK && y <= baseline && top > bestTop) {
				bestTop = top

				best = series
			}
		}
	}

	return best
}

/**
 * Whether the pointer sits inside any series' fill — the tooltip's gate,
 * resolved through {@link nearestSeriesArea} so the hit test and the mark
 * isolation read one geometry.
 *
 * @internal
 */
export function withinSeriesAreas(
	seriesRuns: LinePoint[][][],
	baseline: number,
	x: number,
	y: number,
): boolean {
	return nearestSeriesArea(seriesRuns, baseline, x, y) !== null
}
