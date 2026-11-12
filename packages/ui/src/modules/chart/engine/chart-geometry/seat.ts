/**
 * The geometry of a seat chart: a hemicycle of seats on concentric arcs, as a
 * parliament draws its chamber. The core is pure and works in unit space: the
 * center of the arcs is the origin, the outer arc has a radius of 1, and `y`
 * points down, so the seats sit at `y <= 0`. The chart scales the unit space
 * into its frame ({@link seatFit}).
 */

import { clamp } from '../../../../utilities/clamp'
import { coord } from '../chart-coords'
import { CALLOUT_GAP, CALLOUT_LINE, CALLOUT_NUB } from './pie'

/** The radius of the inner arc, as a fraction of the outer arc, when the chart has two or more rows. @internal */
export const SEAT_INNER_RATIO = 0.4

/** The radius of a seat, as a fraction of the space between two seats. @internal */
const SEAT_DOT_RATIO = 0.42

/** The radius of a lone seat, in unit space. @internal */
const LONE_SEAT_DOT = 0.25

/** The gap between the outer seats and the majority tick, in seat radii. @internal */
const MAJORITY_GAP = 1

/** The length of the majority tick, in unit space. @internal */
const MAJORITY_TICK = 0.12

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
}

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
 * The seats on each arc, in proportion to its radius, so the seats stand about
 * as far apart on each arc. The seats that the rounding leaves go to the outer
 * arcs first.
 *
 * @internal
 */
function arcCounts(total: number, radii: number[]): number[] {
	const sum = radii.reduce((acc, radius) => acc + radius, 0)

	const counts = radii.map((radius) => Math.floor((total * radius) / sum))

	let rest = total - counts.reduce((acc, count) => acc + count, 0)

	for (let row = radii.length - 1; rest > 0; row = (row - 1 + radii.length) % radii.length) {
		counts[row] = (counts[row] ?? 0) + 1

		rest--
	}

	return counts
}

/**
 * The seats of a hemicycle of `total` seats on `rows` arcs. Each arc spreads
 * its seats evenly from the start (`π`) to the end (`0`). A lone seat on an arc
 * sits at the top. The seats sort by angle and then by radius, so a run of
 * seats fills a wedge of the hemicycle. A group of seats therefore reads as one
 * block from the start to the end. Each seat takes {@link SEAT_DOT_RATIO} of the
 * smallest space between two seats, along an arc or from one arc to the next.
 *
 * @internal
 */
export function seatLayout(total: number, rows: number): SeatLayout {
	const count = Math.max(0, Math.floor(total))

	if (count === 0) return { seats: [], dot: 0 }

	const radii = arcRadii(Math.max(1, Math.min(Math.floor(rows), count)))

	const counts = arcCounts(count, radii)

	const seats: Seat[] = []

	// The space between two seats: from one arc to the next, and along each arc.
	let space =
		radii.length > 1 ? (1 - SEAT_INNER_RATIO) / (radii.length - 1) : Number.POSITIVE_INFINITY

	radii.forEach((radius, row) => {
		const onArc = counts[row] ?? 0

		if (onArc > 1) space = Math.min(space, (Math.PI * radius) / (onArc - 1))

		for (let seat = 0; seat < onArc; seat++) {
			const angle = onArc === 1 ? Math.PI / 2 : Math.PI * (1 - seat / (onArc - 1))

			seats.push({ x: radius * Math.cos(angle), y: -radius * Math.sin(angle), angle, radius })
		}
	})

	seats.sort((a, b) => b.angle - a.angle || a.radius - b.radius)

	const dot = Number.isFinite(space) ? space * SEAT_DOT_RATIO : LONE_SEAT_DOT

	return { seats, dot }
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

/**
 * The angle of the line that marks a majority: midway between the last seat of
 * the majority and the next seat. `null` where the majority is not a seat count
 * strictly inside the chamber.
 *
 * @internal
 */
export function majorityAngle(seats: readonly Seat[], majority: number | undefined): number | null {
	if (majority === undefined || !Number.isInteger(majority)) return null

	const last = seats[majority - 1]

	const next = seats[majority]

	if (!last || !next) return null

	return (last.angle + next.angle) / 2
}

/**
 * The ends of the majority tick in unit space: a short radial stroke past the
 * outer arc, clear of the seats. A line across the arcs would touch the seats
 * near it, because the seats of each arc sit at other angles.
 *
 * @internal
 */
export function majorityLine(
	angle: number,
	layout: SeatLayout,
): { x1: number; y1: number; x2: number; y2: number } {
	const from = 1 + (1 + MAJORITY_GAP) * layout.dot

	const to = from + MAJORITY_TICK

	return {
		x1: from * Math.cos(angle),
		y1: -from * Math.sin(angle),
		x2: to * Math.cos(angle),
		y2: -to * Math.sin(angle),
	}
}

/** The scale and the center that fit the unit hemicycle into a box. @internal */
export type SeatFit = {
	/** The size of one unit, in px. */
	scale: number
	cx: number
	cy: number
}

/**
 * Fits the hemicycle into a box of `width` by `height` with `margin` on each
 * side, centered in the box. The hemicycle spans `2 (1 + dot)` across and
 * `1 + 2 dot` down. With `tick`, the box also holds the majority tick above
 * the outer arc. With `label`, the top margin is at least half a
 * {@link CALLOUT_LINE line}, so the label at the end of the tick
 * ({@link majorityCallout}) stays in the box. The label does not change the
 * fit when it does not draw, so the fit never depends on the text.
 *
 * @internal
 */
export function seatFit(
	width: number,
	height: number,
	margin: number,
	dot: number,
	tick = false,
	label = false,
): SeatFit {
	const top = tick ? 1 + (1 + MAJORITY_GAP) * dot + MAJORITY_TICK : 1 + dot

	const across = 2 * (1 + dot)

	const down = top + dot

	const topMargin = tick && label ? Math.max(margin, CALLOUT_LINE / 2) : margin

	const scale = Math.max(
		0,
		Math.min((width - 2 * margin) / across, (height - margin - topMargin) / down),
	)

	// The box of the drawing is centered between the margins: its top at
	// cy - top·scale, its bottom at cy + dot·scale.
	return {
		scale,
		cx: width / 2,
		cy: (topMargin + height - margin) / 2 + ((top - dot) * scale) / 2,
	}
}

/** The rounding, in px, that a label edge can pass the frame by: far below a device pixel. @internal */
const EDGE_SLACK = 1e-6

/** The majority label beside the tick, in px in the frame. @internal */
export type MajorityCallout = {
	/** The nub: a short horizontal stroke from the outer end of the tick toward the label. */
	nub: { x1: number; y1: number; x2: number; y2: number }
	/** The anchor x of the label, a constant gap past the nub. */
	x: number
	/** The middle of the label, level with the outer end of the tick. */
	y: number
	/** A label right of the center reads out from its start, a label left of it from its end. */
	anchor: 'start' | 'end'
}

/** Options for {@link majorityCallout}. @internal */
export type MajorityCalloutOptions = {
	/** The angle of the majority tick ({@link majorityAngle}). */
	angle: number
	layout: SeatLayout
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
 * Places the majority label as a chart callout: the tick is its leader, a
 * {@link CALLOUT_NUB nub} turns from the outer end of the tick toward the
 * side of the tick, and the label sits a {@link CALLOUT_GAP gap} past the nub,
 * level with the end. A label right of the center reads out from its start,
 * a label left of it from its end, so it always reads away from the tick.
 *
 * The label shows only where it has the space: its box of one
 * {@link CALLOUT_LINE line} must stay inside the frame, `margin` from each
 * side, and `margin` clear of the outer seats. Otherwise the result is `null`,
 * and the tick draws alone. The frame never grows for the label.
 *
 * @internal
 */
export function majorityCallout({
	angle,
	layout,
	fit,
	width,
	height,
	margin,
	textWidth,
}: MajorityCalloutOptions): MajorityCallout | null {
	if (fit.scale <= 0 || textWidth <= 0) return null

	const end = (1 + (1 + MAJORITY_GAP) * layout.dot + MAJORITY_TICK) * fit.scale

	const ex = fit.cx + end * Math.cos(angle)

	const ey = fit.cy - end * Math.sin(angle)

	const dir = Math.cos(angle) >= 0 ? 1 : -1

	const nubX = ex + dir * CALLOUT_NUB

	const x = nubX + dir * CALLOUT_GAP

	const left = dir > 0 ? x : x - textWidth

	const right = dir > 0 ? x + textWidth : x

	const top = ey - CALLOUT_LINE / 2

	const bottom = ey + CALLOUT_LINE / 2

	// A label at the reserved top margin sits there up to rounding, so the edges allow a hair.
	if (
		left < margin - EDGE_SLACK ||
		right > width - margin + EDGE_SLACK ||
		top < -EDGE_SLACK ||
		bottom > height + EDGE_SLACK
	) {
		return null
	}

	// The point of the label box nearest the center of the arcs keeps clear of the outer seats.
	const nearX = clamp(fit.cx, left, right)

	const nearY = clamp(fit.cy, top, bottom)

	const outer = (1 + layout.dot) * fit.scale

	if (Math.hypot(nearX - fit.cx, nearY - fit.cy) < outer + margin) return null

	return {
		nub: { x1: ex, y1: ey, x2: nubX, y2: ey },
		x,
		y: ey,
		anchor: dir > 0 ? 'start' : 'end',
	}
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
