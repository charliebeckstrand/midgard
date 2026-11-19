/**
 * Pure pointer hit tests for the cartesian marks:
 *
 * - Which bar the pointer covers.
 * - Which thin mark (a line or a reference rule) it rests on.
 * - Which series' fill it sits inside.
 *
 * Each resolves to the mark or series, or `null` for a miss. The hit layer
 * feeds them into the hover context, so the tooltip shows only over data. The
 * hover index (and any crosshair riding it) keeps tracking the whole plot.
 */

import { clamp } from '../../../utilities/clamp'
import type { BarMark } from './chart-geometry/bar'
import type { LinePoint } from './chart-geometry/line'
import type { ChartOrientation } from './chart-orientation'

/**
 * How near the pointer must come to a thin mark (a line or a reference rule) to
 * catch it, in px. A generous catch, so the readout is easy to summon and the
 * mark easy to isolate by aim alone. It asks none of the pixel precision that a
 * 2px stroke would otherwise demand. A snapping crosshair bypasses this: it
 * reads the nearest point anywhere in the plot.
 *
 * @internal
 */
export const THIN_MARK_CATCH = 16

/**
 * The hold of the held thin mark, in px ({@link thinMarkAt}). Another mark must
 * come this much nearer than the held mark to take the pointer, and the held
 * mark catches the pointer this much farther out. Without it, a pointer that
 * shakes on a boundary flips the readout: the boundary between two marks, or
 * the edge of a catch. The hold is a distance on the screen because the shake
 * is one.
 *
 * @internal
 */
const THIN_MARK_HOLD = 2

/** Slack above an area's top edge, so its own stroke counts as inside. @internal */
const AREA_EDGE_SLACK = 4

/**
 * How decisively a challenger must out-close the held disc of a scatter to take
 * the emphasis within overlapping catches: to under half its distance. Nearest-mark
 * resolution alone flips at the exact midline between two close marks: a knife
 * edge. The mark already emphasized therefore holds until the pointer commits
 * to another, which turns the flip point into a deadband.
 *
 * @internal
 */
const MARK_HOLD_RATIO = 0.5

/**
 * Whether a challenger at `challengerSquared` decisively beats a held mark at
 * `heldSquared`: closer than {@link MARK_HOLD_RATIO} of its distance.
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
 * The bar the pointer sits on (its series and datum indices), or `null` off
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
 * A thin mark that the pointer rests on: a line, by its place in the list of
 * lines, or a reference rule, by its place in the `reference` prop.
 *
 * @internal
 */
export type ThinMark = { line: number; rule?: never } | { rule: number; line?: never }

/**
 * The distance from the pointer to one run along the value axis, at the band
 * position of the pointer. Where no chord of the run spans that position (past
 * an end of the run, or a run of one point), it is the straight distance to
 * the nearer end. The two agree at an end, so the distance has no step there.
 * A chord that stands straight along the value axis spans one band position,
 * and the distance there is to the nearer point of the chord.
 *
 * @internal
 */
function valueDistance(run: LinePoint[], band: number, value: number): number {
	let best = Number.POSITIVE_INFINITY

	for (let i = 0; i < run.length - 1; i++) {
		const a = run[i] as LinePoint

		const b = run[i + 1] as LinePoint

		if (band < Math.min(a.x, b.x) || band > Math.max(a.x, b.x)) continue

		const distance =
			a.x === b.x
				? Math.max(Math.min(a.y, b.y) - value, 0, value - Math.max(a.y, b.y))
				: Math.abs(value - (a.y + ((band - a.x) / (b.x - a.x)) * (b.y - a.y)))

		best = Math.min(best, distance)
	}

	if (best < Number.POSITIVE_INFINITY) return best

	const first = run[0] as LinePoint

	const last = run.at(-1) as LinePoint

	return Math.min(
		Math.hypot(band - first.x, value - first.y),
		Math.hypot(band - last.x, value - last.y),
	)
}

/**
 * The value-axis distance from the pointer to one line, over the runs that
 * catch the pointer within `reach`, or `null` where no run catches it.
 *
 * @internal
 */
function lineReading(
	runs: LinePoint[][],
	band: number,
	value: number,
	reach: number,
): number | null {
	const catchSquared = reach * reach

	let best: number | null = null

	for (const run of runs) {
		if (run.length === 0 || runDistanceSquared(run, band, value) > catchSquared) continue

		const distance = valueDistance(run, band, value)

		if (best === null || distance < best) best = distance
	}

	return best
}

/** Whether two thin marks are the same mark. @internal */
function sameThinMark(a: ThinMark, b: ThinMark): boolean {
	return a.line === b.line && a.rule === b.rule
}

/**
 * The thin mark that the pointer rests on: a line or a reference rule, or
 * `null` off each one. The pointer sits at `band` along the band axis and at
 * `value` along the value axis. Three rules decide.
 *
 * 1. A mark catches the pointer within {@link THIN_MARK_CATCH} of it, in a
 *    straight line. A pointer misses by the same distance in each direction,
 *    so a steep line catches as wide as a flat one.
 * 2. Among the marks that catch the pointer, the mark nearest along the value
 *    axis takes it. That is how a reader compares lines: which line is at this
 *    height here. The snapped readout and the keyboard pick a series in a
 *    category by the same axis. Two lines that cross part at the line of
 *    their mean slope through the crossing, so the flatter line takes the
 *    larger part.
 * 3. The `held` mark holds by {@link THIN_MARK_HOLD}. It catches the pointer
 *    that much farther out, and it keeps the pointer until another mark comes
 *    that much nearer. Thus a pointer that shakes on a boundary, or on the edge
 *    of a catch, does not flip the readout.
 *
 * At the same distance, a line takes the pointer from a rule, and a line later
 * in `lines` takes it from an earlier line. So the data wins over the
 * annotation, and the line drawn on top wins over the line under it.
 *
 * Each line is its drawn shape: its trace, a polyline for each run
 * ({@link traceRun}), in band and value coordinates. The value distance and the
 * value at a band position follow {@link valueDistance}. A rule is a value
 * position across the whole plot, or `null` for a rule that takes no pointer,
 * so its distance is the distance along the value axis.
 *
 * @internal
 */
export function thinMarkAt(
	lines: readonly LinePoint[][][],
	rules: readonly (number | null)[],
	band: number,
	value: number,
	held: ThinMark | null = null,
): ThinMark | null {
	let best: { mark: ThinMark; distance: number } | null = null

	let heldDistance: number | null = null

	// The held mark catches the pointer farther out by the hold.
	const reach = (mark: ThinMark) =>
		held !== null && sameThinMark(mark, held) ? THIN_MARK_CATCH + THIN_MARK_HOLD : THIN_MARK_CATCH

	const consider = (mark: ThinMark, distance: number) => {
		if (held !== null && sameThinMark(mark, held)) heldDistance = distance

		// A later mark wins a tie: the rules come first, then the lines in paint order.
		if (best === null || distance <= best.distance) best = { mark, distance }
	}

	rules.forEach((at, rule) => {
		if (at === null) return

		const distance = Math.abs(value - at)

		if (distance <= reach({ rule })) consider({ rule }, distance)
	})

	lines.forEach((runs, line) => {
		const distance = lineReading(runs, band, value, reach({ line }))

		if (distance !== null) consider({ line }, distance)
	})

	if (best === null) return null

	const { mark, distance } = best as { mark: ThinMark; distance: number }

	// The held mark keeps the pointer unless the nearest mark beats it by the hold.
	if (held !== null && heldDistance !== null && distance > heldDistance - THIN_MARK_HOLD) {
		return held
	}

	return mark
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

	const getBase = typeof base === 'number' ? () => base : base

	for (let series = 0; series < seriesRuns.length; series++) {
		const top = seriesTopAt(seriesRuns[series] as LinePoint[][], x)

		const lower = stacked && series > 0 ? below : getBase(series)

		below = top

		const reach = fillReach(top, lower, y)

		if (reach === null) continue

		// The reach is signed: a pointer in the stroke slack sits outside the top
		// edge, at a negative reach. Its distance to the edge is the size of the
		// reach either way.
		const distance = Math.abs(reach)

		if (stacked && reach >= 0) {
			inside = series
		} else if (distance < nearestReach) {
			nearestReach = distance

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
