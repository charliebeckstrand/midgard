/**
 * The geometry of a seat chart: a hemicycle of seats on concentric arcs, as a
 * parliament draws its chamber. The core is pure and works in unit space: the
 * center of the arcs is the origin, the outer arc has a radius of 1, and `y`
 * points down, so the seats sit at `y <= 0`. The chart scales the unit space
 * into its frame ({@link seatFit}).
 */

import { clamp } from '../../../../utilities/clamp'
import { coord } from '../chart-coords'
import { CALLOUT_LINE } from './pie'

/** The radius of the inner arc, as a fraction of the outer arc, when the chart has two or more rows. @internal */
export const SEAT_INNER_RATIO = 0.4

/** The radius of a seat, as a fraction of the space between two seats. @internal */
const SEAT_DOT_RATIO = 0.42

/** The radius of a lone seat, in unit space. @internal */
const LONE_SEAT_DOT = 0.25

/**
 * The least clear space between the majority line and the nearest seat, in
 * unit space: a fixed share of the radius of the hemicycle. Thus the space has
 * one size at one chart size, for a chamber of large seats or of small seats.
 *
 * @internal
 */
const AISLE_GAP = 0.02

/** The length of one dash and one gap of the majority line, in unit space. @internal */
const DASH_PERIOD = 0.035

/** The part of each period that the dash fills. @internal */
const DASH_RATIO = 0.6

/** The gap between the majority label and the top of the line, in px. @internal */
const LABEL_GAP = 2

/** One seat in unit space: its center, and its angle and arc radius. @internal */
export type Seat = {
	x: number
	y: number
	/** The angle from the positive x axis, from `π` (the start of the hemicycle) to `0` (the end). */
	angle: number
	/** The radius of the arc that holds the seat. */
	radius: number
}

/** The seats of a hemicycle and the radius of each seat, in unit space. @internal */
export type SeatLayout = {
	/** The seats in order: by angle from the start, then from the inner arc out. */
	seats: Seat[]
	/** The radius of each seat. */
	dot: number
	/** The angle of the aisle at the majority, or `null` where the chamber has no aisle. */
	aisle: number | null
}

/** A point in unit space or in px. @internal */
type Point = { x: number; y: number }

/**
 * The number of rows that keeps the seats about as far apart along an arc as
 * from one arc to the next: 4 rows for 50 seats, 5 for 100, and 10 for 435.
 *
 * @internal
 */
export function seatRows(total: number): number {
	return Math.max(1, Math.round(Math.sqrt(total / 4)))
}

/**
 * The radius of each arc, from the inner arc out. One row sits on the outer
 * arc. More rows spread evenly from {@link SEAT_INNER_RATIO} to 1.
 *
 * @internal
 */
function arcRadii(rows: number): number[] {
	if (rows === 1) return [1]

	return Array.from(
		{ length: rows },
		(_, row) => SEAT_INNER_RATIO + ((1 - SEAT_INNER_RATIO) * row) / (rows - 1),
	)
}

/**
 * The seats on each arc, in proportion to the weight of the arc: the length
 * of the arc that takes seats. Thus the seats stand about as far apart on each
 * arc. The seats that the rounding leaves go to the outer arcs first. An arc
 * with no weight takes no seat.
 *
 * @internal
 */
function arcCounts(total: number, weights: number[]): number[] {
	const sum = weights.reduce((acc, weight) => acc + weight, 0)

	const counts = weights.map((weight) => (sum > 0 ? Math.floor((total * weight) / sum) : 0))

	let rest = total - counts.reduce((acc, count) => acc + count, 0)

	for (
		let row = weights.length - 1;
		rest > 0 && sum > 0;
		row = (row - 1 + weights.length) % weights.length
	) {
		if ((weights[row] ?? 0) <= 0) continue

		counts[row] = (counts[row] ?? 0) + 1

		rest--
	}

	return counts
}

/** The seats of one side of the aisle: the span of each arc, from the start angle to the end angle. @internal */
type Side = { seats: number; spans: { from: number; to: number }[] }

/**
 * The sides of a chamber. With no aisle, one side holds each arc from `π` to
 * `0`. With an aisle, `before` seats take the arcs from `π` to the aisle, and
 * the other seats take the arcs from the aisle to `0`. The aisle has the half
 * width `w` on each arc. The aisle stands where each side has the length of arc
 * that its seats need, so the seats stand as far apart on each side.
 *
 * @internal
 */
function chamberSides(
	count: number,
	radii: number[],
	before: number,
	w: number,
): { sides: Side[]; aisle: number | null } {
	const whole: Side[] = [{ seats: count, spans: radii.map(() => ({ from: Math.PI, to: 0 })) }]

	if (before <= 0) return { sides: whole, aisle: null }

	const sum = radii.reduce((acc, radius) => acc + radius, 0)

	// The length of arc that takes seats, less the aisle on each arc.
	const usable = Math.PI * sum - 2 * radii.length * w

	if (usable <= 0) return { sides: whole, aisle: null }

	const aisle = Math.PI - (radii.length * w + (usable * before) / count) / sum

	return {
		sides: [
			{ seats: before, spans: radii.map((radius) => ({ from: Math.PI, to: aisle + w / radius })) },
			{
				seats: count - before,
				spans: radii.map((radius) => ({ from: aisle - w / radius, to: 0 })),
			},
		],
		aisle,
	}
}

/**
 * The seats of a hemicycle of `total` seats on `rows` arcs. Each arc spreads
 * its seats evenly from the start (`π`) to the end (`0`). A lone seat on an arc
 * sits at the middle of its span. The seats sort by angle and then by radius,
 * so a run of seats fills a wedge of the hemicycle. A group of seats therefore
 * reads as one block from the start to the end. Each seat takes
 * {@link SEAT_DOT_RATIO} of the smallest space between two seats, along an arc
 * or from one arc to the next.
 *
 * With a `majority` inside the chamber, an aisle opens before the seat that
 * makes the majority. Each arc spreads the seats before the aisle and the seats
 * after it on each side of the aisle. Thus a straight line down the aisle parts
 * the seats, and a group passes the line on the seat that makes the majority.
 * A simple majority puts the aisle down the middle, or half a seat from it in a
 * chamber of an odd size. A chamber too small for an aisle has none.
 *
 * @internal
 */
export function seatLayout(total: number, rows: number, majority?: number): SeatLayout {
	const count = Math.max(0, Math.floor(total))

	if (count === 0) return { seats: [], dot: 0, aisle: null }

	const radii = arcRadii(Math.max(1, Math.min(Math.floor(rows), count)))

	const before =
		majority !== undefined && Number.isInteger(majority) && majority >= 2 && majority <= count
			? majority - 1
			: 0

	// The half width of the aisle: a seat of the chamber with no aisle, and the gap. The aisle
	// makes the seats a little smaller, so the gap is at least AISLE_GAP.
	const half = before > 0 ? seatLayout(count, rows).dot + AISLE_GAP : 0

	const { sides, aisle } = chamberSides(count, radii, before, half)

	const seats: Seat[] = []

	// The space between two seats: from one arc to the next, and along each arc.
	let space =
		radii.length > 1 ? (1 - SEAT_INNER_RATIO) / (radii.length - 1) : Number.POSITIVE_INFINITY

	for (const side of sides) {
		const counts = arcCounts(
			side.seats,
			radii.map((radius, row) => {
				const span = side.spans[row]

				// The arc length over π: a whole arc weighs its radius.
				return span ? Math.max(0, radius * ((span.from - span.to) / Math.PI)) : 0
			}),
		)

		radii.forEach((radius, row) => {
			const onArc = counts[row] ?? 0

			const span = side.spans[row]

			if (!span || onArc === 0) return

			const length = span.from - span.to

			if (onArc > 1) space = Math.min(space, (length * radius) / (onArc - 1))

			for (let seat = 0; seat < onArc; seat++) {
				const angle =
					onArc === 1 ? span.to + length / 2 : span.to + length * (1 - seat / (onArc - 1))

				seats.push({ x: radius * Math.cos(angle), y: -radius * Math.sin(angle), angle, radius })
			}
		})
	}

	seats.sort((a, b) => b.angle - a.angle || a.radius - b.radius)

	const dot = Number.isFinite(space) ? space * SEAT_DOT_RATIO : LONE_SEAT_DOT

	return { seats, dot, aisle }
}

/**
 * The radius of the clear hole of a hemicycle, in unit space: the inner arc
 * less a seat and a gap of one seat radius, so content in the hole keeps clear
 * of the seats. A chart with no seat has no hole.
 *
 * @internal
 */
export function seatHole(layout: SeatLayout): number {
	if (layout.seats.length === 0) return 0

	const inner = layout.seats.reduce((min, seat) => Math.min(min, seat.radius), 1)

	return Math.max(0, inner - 2 * layout.dot)
}

/**
 * The group of each seat: the groups take the seats in order, each as many as
 * its count. A seat past the sum of the counts takes no group (`-1`).
 *
 * @internal
 */
export function seatGroups(counts: readonly number[], total: number): number[] {
	const groups: number[] = []

	counts.forEach((count, group) => {
		for (let seat = 0; seat < count && groups.length < total; seat++) groups.push(group)
	})

	while (groups.length < total) groups.push(-1)

	return groups
}

/** The majority mark of a hemicycle, in unit space. @internal */
export type MajorityMark = {
	/** The dashes of the line down the aisle, from its outer end to its inner end. */
	dashes: { x1: number; y1: number; x2: number; y2: number }[]
	/** The outer end of the line, past the outer arc. */
	top: Point
}

/** The point at `radius` from the center of the arcs, at `angle`. @internal */
function polar(radius: number, angle: number): Point {
	return { x: radius * Math.cos(angle), y: -radius * Math.sin(angle) }
}

/**
 * The clear space between the line down the aisle and the nearest seat beside
 * it: the distance from the line to the edge of that seat. Only the seats on
 * the side of the center where the line runs count.
 *
 * @internal
 */
function aisleGap(layout: SeatLayout, angle: number): number {
	let gap = Number.POSITIVE_INFINITY

	for (const seat of layout.seats) {
		const turn = seat.angle - angle

		if (Math.cos(turn) > 0) gap = Math.min(gap, Math.abs(seat.radius * Math.sin(turn)) - layout.dot)
	}

	return Number.isFinite(gap) ? Math.max(0, gap) : 0
}

/**
 * The majority mark of a hemicycle with an aisle ({@link seatLayout}): a
 * dashed line down the aisle. The line keeps one clear space from the seats
 * on all sides: the space between the line and the seats beside it is also
 * the space past the outer seats and the space inside the inner seats. The
 * dashes divide the line evenly, so the line starts and ends on a dash. `null`
 * where the chamber has no aisle.
 *
 * @internal
 */
export function majorityMark(layout: SeatLayout): MajorityMark | null {
	const angle = layout.aisle

	if (angle === null || layout.seats.length === 0) return null

	const gap = aisleGap(layout, angle)

	const inner = layout.seats.reduce((min, seat) => Math.min(min, seat.radius), 1)

	const from = 1 + layout.dot + gap

	const to = Math.max(0, inner - layout.dot - gap)

	const length = from - to

	const count = Math.max(1, Math.round(length / DASH_PERIOD + 1 - DASH_RATIO))

	const period = length / (count - 1 + DASH_RATIO)

	const dashes = Array.from({ length: count }, (_, dash) => {
		const start = polar(from - dash * period, angle)

		const end = polar(from - dash * period - DASH_RATIO * period, angle)

		return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
	})

	return { dashes, top: polar(from, angle) }
}

/** The scale and the center that fit the unit hemicycle into a box. @internal */
export type SeatFit = {
	/** The size of one unit, in px. */
	scale: number
	cx: number
	cy: number
}

/** The box of the drawing of a hemicycle, in unit space. @internal */
export type SeatExtent = {
	/** The distance from the center of the arcs up to the top of the drawing. */
	top: number
	/** The width of the drawing. The center of the arcs is at its middle. */
	across: number
	/** The height of the drawing: `top`, and the part of the drawing under the center. */
	down: number
}

/**
 * The box of the drawing of a hemicycle, in unit space: the seats, and the
 * outer end of the majority line where the chamber has an aisle. The box is
 * centered on the center of the arcs across, so a line near the end of the
 * hemicycle widens it on both sides.
 *
 * @internal
 */
export function seatExtent(layout: SeatLayout): SeatExtent {
	let top = 1 + layout.dot

	let half = 1 + layout.dot

	let bottom = layout.dot

	const end = majorityMark(layout)?.top

	if (end) {
		top = Math.max(top, -end.y)

		half = Math.max(half, Math.abs(end.x))

		bottom = Math.max(bottom, end.y)
	}

	return { top, across: 2 * half, down: top + bottom }
}

/**
 * Fits the drawing of a hemicycle ({@link seatExtent}) into a box of `width`
 * by `height` with `margin` on each side, centered in the box. With `label`,
 * the top margin also holds one {@link CALLOUT_LINE line} and a gap, so the
 * label above the majority line ({@link majorityLabel}) stays in the box.
 * The label does not change the fit when it does not draw, so the fit never
 * depends on the text.
 *
 * @internal
 */
export function seatFit(
	width: number,
	height: number,
	margin: number,
	extent: SeatExtent,
	label = false,
): SeatFit {
	const { top, across, down } = extent

	const topMargin = label ? Math.max(margin, CALLOUT_LINE + LABEL_GAP) : margin

	const scale = Math.max(
		0,
		Math.min((width - 2 * margin) / across, (height - margin - topMargin) / down),
	)

	// The box of the drawing is centered between the margins: its top at
	// cy - top·scale, its bottom at cy + (down - top)·scale.
	return {
		scale,
		cx: width / 2,
		cy: (topMargin + height - margin) / 2 + ((2 * top - down) * scale) / 2,
	}
}

/** The rounding, in px, that a label edge can pass the frame by: far below a device pixel. @internal */
const EDGE_SLACK = 1e-6

/** The majority label above the line, in px in the frame. @internal */
export type MajorityLabel = {
	/** The middle of the label, across. */
	x: number
	/** The middle of the label, down. */
	y: number
}

/** Options for {@link majorityLabel}. @internal */
export type MajorityLabelOptions = {
	/** The majority mark ({@link majorityMark}). */
	mark: MajorityMark
	fit: SeatFit
	/** The size of the frame, in px. */
	width: number
	height: number
	/** The gap that the label keeps from the sides of the frame and from the seats, in px. */
	margin: number
	/** The drawn width of the label, in px. */
	textWidth: number
}

/**
 * Places the majority label above the majority line, centered on the outer end
 * of the line, a gap above it. The label shows only where it has the space:
 * its box of one {@link CALLOUT_LINE line} must stay inside the frame,
 * `margin` from each side, and no nearer to the center of the arcs than the
 * outer end of the line, so it keeps the clear space of the line from the
 * seats. Otherwise the result is `null`, and the line draws alone. The frame
 * never grows for the label.
 *
 * @internal
 */
export function majorityLabel({
	mark,
	fit,
	width,
	height,
	margin,
	textWidth,
}: MajorityLabelOptions): MajorityLabel | null {
	if (fit.scale <= 0 || textWidth <= 0) return null

	const x = fit.cx + mark.top.x * fit.scale

	const bottom = fit.cy + mark.top.y * fit.scale - LABEL_GAP

	const top = bottom - CALLOUT_LINE

	const left = x - textWidth / 2

	const right = x + textWidth / 2

	// A label at the reserved top margin sits there up to rounding, so the edges allow a hair.
	if (
		left < margin - EDGE_SLACK ||
		right > width - margin + EDGE_SLACK ||
		top < -EDGE_SLACK ||
		bottom > height + EDGE_SLACK
	) {
		return null
	}

	// The point of the label box nearest the center of the arcs stays past the outer end of the line.
	const nearX = clamp(fit.cx, left, right)

	const nearY = clamp(fit.cy, top, bottom)

	const end = Math.hypot(mark.top.x, mark.top.y) * fit.scale

	if (Math.hypot(nearX - fit.cx, nearY - fit.cy) < end - EDGE_SLACK) return null

	return { x, y: top + CALLOUT_LINE / 2 }
}

/**
 * The seat nearest a point in unit space, within `reach`, or `null` where no
 * seat is that near. The hover reads it, so a point in the gap between two
 * seats still names one of them.
 *
 * @internal
 */
export function nearestSeat(
	seats: readonly Seat[],
	x: number,
	y: number,
	reach: number,
): number | null {
	let best: number | null = null

	let bestDistance = reach * reach

	seats.forEach((seat, index) => {
		const distance = (seat.x - x) ** 2 + (seat.y - y) ** 2

		if (distance <= bestDistance) {
			best = index

			bestDistance = distance
		}
	})

	return best
}

/**
 * The SVG path of a set of discs of radius `r`, each two half arcs, in one
 * string. One path per group draws a few hundred seats as a few nodes.
 *
 * @internal
 */
export function discsPath(points: readonly { x: number; y: number }[], r: number): string {
	// Each disc shares the radius, so the arcs format once.
	const radius = coord(r)

	const arcs = `a${radius} ${radius} 0 1 0 ${coord(2 * r)} 0a${radius} ${radius} 0 1 0 ${coord(-2 * r)} 0`

	let d = ''

	for (const point of points) {
		d += `M${coord(point.x - r)} ${coord(point.y)}${arcs}`
	}

	return d
}
