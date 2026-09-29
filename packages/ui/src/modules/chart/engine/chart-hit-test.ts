/**
 * Pure pointer hit tests for the cartesian marks:
 *
 * - Which bar the pointer covers.
 * - Which series' line it is nearest.
 * - Which series' fill it sits inside.
 *
 * Each resolves to the mark or series, or `null` for a miss. The hit layer
 * feeds them into the hover context, so the tooltip shows only over data. The
 * hover index — and any crosshair riding it — keeps tracking the whole plot.
 */

import { clamp } from '../../../utilities'
import type { BarMark } from './chart-geometry/bar'
import type { LinePoint } from './chart-geometry/line'
import type { ChartOrientation } from './chart-orientation'

/**
 * How near the pointer must come to a line to count as on it, in px. A generous
 * catch, so the tooltip is easy to summon and the line easy to isolate by aim
 * alone. It asks none of the pixel precision a 2px stroke would otherwise
 * demand. A snapping crosshair bypasses this: it reads the nearest point
 * anywhere in the plot.
 *
 * @internal
 */
const LINE_HIT_TOLERANCE = 16

/** Slack above an area's top edge, so its own stroke counts as inside. @internal */
const AREA_EDGE_SLACK = 4

/**
 * How decisively a challenger must out-close the held mark to take the
 * emphasis within overlapping catches: to under half its distance. Nearest-mark
 * resolution alone flips at the exact midline between two close marks: a knife
 * edge. The mark already emphasized therefore holds until the pointer commits
 * to another, which turns the flip point into a deadband.
 *
 * @internal
 */
const MARK_HOLD_RATIO = 0.5

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
 * truly covers. Only where no body catches it does the widened `gap` pass close
 * the thin gaps between a group's bars. Each bar's slack reaches its
 * neighbor's edge. A pointer sweeping across a group therefore never falls
 * between them and flickers the tooltip. The wider between-group padding stays
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
	// than a gap-widened neighbor, then the widened spans to bridge the gaps.
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

/** Squared distance from the pointer to the segment `a`→`b`. @internal */
function segmentDistanceSquared(x: number, y: number, a: LinePoint, b: LinePoint): number {
	const dx = b.x - a.x

	const dy = b.y - a.y

	const lengthSquared = dx * dx + dy * dy

	const t = lengthSquared === 0 ? 0 : clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSquared, 0, 1)

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
 * series — the one already emphasized — keeps the win while it stays within the
 * catch, unless a challenger {@link beatsHeldMark | decisively} closes. The
 * resolution is sticky across the midline between two close strokes, rather
 * than flipping on the knife edge. Each series brings its gap-split runs, so
 * the test never bridges a gap. A smooth curve is tested against its chords,
 * which the tolerance comfortably covers.
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
 * The series whose fill the pointer sits in, or `null` outside every fill. A
 * fill spans from its top edge to its lower edge, with a little slack past the
 * top edge for the stroke. The lower edge is the zero line of the series
 * (`base`), and for a `stacked` ribbon it is the top edge of the ribbon below.
 * A negative wash fills up from its line to its zero line, so the test reads
 * the span either way round.
 *
 * Unstacked washes overlap, each covering to its zero line. Where they do, the
 * one whose top edge sits nearest the pointer wins, and the first wins a tie.
 * The isolation thus lifts the wash the pointer is actually inside, rather than
 * every wash beneath it. Stacked ribbons follow the paint order instead: a
 * later ribbon draws over an earlier one where a negative value folds it back,
 * so the last ribbon that holds the pointer wins. The stroke slack decides only
 * when no ribbon holds it.
 *
 * @param base - The lower edge of a fill that does not stack: one line for each
 * series, or one line for all of them (the plot floor of a line chart wash).
 * @param stacked - Close each fill on the top edge of the series before it, as
 * the ribbons of a stack do. The first series closes on its `base`.
 * @internal
 */
export function nearestSeriesArea(
	seriesRuns: LinePoint[][][],
	base: number | ((series: number) => number),
	x: number,
	y: number,
	stacked = false,
): number | null {
	// The fill whose top edge sits nearest the pointer; for a stack, the fallback
	// when the pointer sits only in the stroke slack.
	let nearest: number | null = null

	let nearestReach = Number.POSITIVE_INFINITY

	// The last stacked ribbon that holds the pointer.
	let inside: number | null = null

	// The top edge of the series before, at `x`: the lower edge of a stacked ribbon.
	let below: number | null = null

	const baseOf = typeof base === 'number' ? () => base : base

	for (let series = 0; series < seriesRuns.length; series++) {
		const top = seriesTopAt(seriesRuns[series] as LinePoint[][], x)

		const lower = stacked && series > 0 ? below : baseOf(series)

		below = top

		const reach = fillReach(top, lower, y)

		if (reach === null) continue

		if (stacked && reach >= 0) {
			inside = series
		} else if (reach < nearestReach) {
			nearestReach = reach

			nearest = series
		}
	}

	return inside ?? nearest
}

/** The top edge of a series at `x`: its runs never share an x, so at most one covers it. @internal */
function seriesTopAt(runs: LinePoint[][], x: number): number | null {
	for (const run of runs) {
		const top = topEdgeY(run, x)

		if (top !== null) return top
	}

	return null
}

/**
 * How far into a fill the pointer sits past its top edge, or `null` outside
 * the fill and its edge slack, or where an edge does not cover the pointer. The
 * fill runs from the top edge toward its lower edge: down the screen for a
 * value above zero, up the screen for one below it.
 *
 * @internal
 */
function fillReach(top: number | null, lower: number | null, y: number): number | null {
	if (top === null || lower === null) return null

	const toward = top <= lower ? 1 : -1

	const reach = (y - top) * toward

	return reach < -AREA_EDGE_SLACK || (lower - y) * toward < 0 ? null : reach
}
