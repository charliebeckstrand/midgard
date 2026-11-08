/**
 * The geometry of a seat chart: a hemicycle of seats on concentric arcs, as a
 * parliament draws its chamber. The core is pure and works in unit space: the
 * center of the arcs is the origin, the outer arc has a radius of 1, and `y`
 * points down, so the seats sit at `y <= 0`. The chart scales the unit space
 * into its frame ({@link seatFit}).
 */

/** The radius of the inner arc, as a fraction of the outer arc, when the chart has two or more rows. @internal */
export const SEAT_INNER_RATIO = 0.4

/** The radius of a seat, as a fraction of the space between two seats. @internal */
const SEAT_DOT_RATIO = 0.42

/** The radius of a lone seat, in unit space. @internal */
const LONE_SEAT_DOT = 0.25

/** How far the majority line goes past the seats, in seat radii. @internal */
const MAJORITY_OVERSHOOT = 1.5

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

/** The ends of the majority line in unit space: from inside the inner arc to past the outer arc. @internal */
export function majorityLine(
	angle: number,
	layout: SeatLayout,
): { x1: number; y1: number; x2: number; y2: number } {
	const inner = Math.min(...layout.seats.map((seat) => seat.radius))

	const from = Math.max(0, inner - MAJORITY_OVERSHOOT * layout.dot)

	const to = 1 + MAJORITY_OVERSHOOT * layout.dot

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
 * Fits the hemicycle and its majority line into a box of `width` by `height`
 * with `margin` on each side, centered in the box. The hemicycle spans
 * `2 (1 + dot)` across and `1 + 1.5 dot + dot` down.
 *
 * @internal
 */
export function seatFit(width: number, height: number, margin: number, dot: number): SeatFit {
	const top = 1 + MAJORITY_OVERSHOOT * dot

	const across = 2 * (1 + dot)

	const down = top + dot

	const scale = Math.max(0, Math.min((width - 2 * margin) / across, (height - 2 * margin) / down))

	// The box of the drawing is centered: its top at cy - top·scale, its bottom at cy + dot·scale.
	return { scale, cx: width / 2, cy: height / 2 + ((top - dot) * scale) / 2 }
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
	let d = ''

	const round = (value: number) => Math.round(value * 100) / 100

	for (const point of points) {
		d += `M${round(point.x - r)} ${round(point.y)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0`
	}

	return d
}
