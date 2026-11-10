/**
 * Which part of the ground under a dot's pointer target belongs to that dot, when another dot stands
 * close enough to want some of it.
 *
 * The companion to `crowd.ts`, answering the same question (how much of this ground is mine) with a
 * shape instead of a radius. A radius is the right answer for a zone's claim. A `MapGeofence` is a
 * face, not a point, so there is no line to divide along. A dot standing on one can only give
 * reach back evenly.
 *
 * A radius is the wrong answer for a neighboring dot. A shrink of both targets to the gap costs
 * each of them reach in every direction. That includes the three quarters of the compass where
 * nothing competes for anything. Two dots twenty pixels apart then get targets that a reader has to
 * aim at precisely. They pay that for an ambiguity that only exists between them.
 *
 * A dot's ground is instead its full target minus whatever lies nearer to a neighbor. The boundary
 * between two dots is the perpendicular bisector of the segment joining them. Each therefore keeps
 * the whole of its finger target outward. The contested middle divides once, evenly, along a line a
 * reader could have drawn themselves. The one exception is a midpoint inside a face, which a
 * summary beside a lone dot can have. The line then moves out to the edge of that face, so each dot
 * keeps at least what it paints. Both dots read the same line, so the division cannot depend on
 * draw order. Without it, the overlap goes to the dot that renders last, and the dot under it loses
 * a crescent of its target, its tooltip, and the edge of its own face.
 *
 * The result is a convex polygon rather than the true circle-minus-lens. The target is a `<circle>`
 * under a `clip-path`, so the arc comes from the circle and this supplies only the straight cuts.
 * Convexity is what makes that sound. A half-plane intersection is always convex, and clipping a
 * convex region by another half-plane keeps it so, however many neighbors crowd in.
 *
 * Frame arithmetic, React-free, like the rest of the engine.
 */

import { clamp } from '../../../../utilities/clamp'
import { POINT_HIT_RADIUS } from '../map-constants'
import { round } from '../map-geometry/mark'
import type { MapPoint2D } from '../types'
import { bucket, squared, toCellKey, walkNear } from './grid'

/**
 * A dot's own ground, as a closed convex ring in frame units: what a `clipPath` draws.
 *
 * @internal
 */
export type MapGround = MapPoint2D[]

/**
 * One drawn dot that divides ground: where it draws, in frame units, and how far it paints from its
 * center, in device pixels. That radius is a lone dot's, a summary's grade, or a pin's.
 *
 * @internal
 */
export type MapGroundDot = {
	at: MapPoint2D
	radius: number
}

/**
 * How far a dot's target reaches, in device pixels: the finger target, or the dot itself where a
 * summary paints past it. The `r` that `dotHitProps` writes.
 *
 * @internal
 */
function targetReach(dot: MapGroundDot): number {
	return Math.max(POINT_HIT_RADIUS, dot.radius)
}

/**
 * Whether two dots stand close enough that their targets overlap, which is when there is ground to
 * divide. Below that the dot keeps its plain circle. That is the case almost every dot on almost
 * every map is in. Hence {@link ownGround} returning `null` rather than a ring covering everything.
 * The overwhelmingly common answer therefore costs no polygon, no `clipPath` element and no id.
 *
 * @internal
 */
function contests(dot: MapGroundDot, other: MapGroundDot, unitsPerPixel: number): boolean {
	const apart = squared(dot.at, other.at)

	const reach = (targetReach(dot) + targetReach(other)) * unitsPerPixel

	// Coincident dots are excluded, not divided: the bisector of a zero-length segment has no
	// direction, and two dots at one position are not tellable apart by any geometry. `group.ts`
	// merges those into one summary where it can see them; where it cannot, an overlap a reader
	// cannot perceive is better than a cut in an arbitrary direction. The same test keeps a dot out
	// of its own neighbors, where a caller hands in a set that holds it.
	return apart > 0 && apart < reach * reach
}

/** Whether `point` is on `at`'s side of the bisector: ties fall inside, so a boundary point is owned. @internal */
function nearer(point: MapPoint2D, mid: MapPoint2D, nx: number, ny: number): boolean {
	return (point.x - mid.x) * nx + (point.y - mid.y) * ny <= 0
}

/** Where segment `a`→`b` meets the bisector. Only called for a pair that straddles it. @internal */
function crossing(
	a: MapPoint2D,
	b: MapPoint2D,
	mid: MapPoint2D,
	nx: number,
	ny: number,
): MapPoint2D {
	const along = (b.x - a.x) * nx + (b.y - a.y) * ny

	// Guarded by the straddle test at the call site: a segment with endpoints on opposite sides of the
	// line is not parallel to it, so this is non-zero. Spelled anyway rather than trusted, because a
	// zero here would put a NaN into a `points` attribute and drop the whole clip silently.
	if (along === 0) return a

	const t = ((mid.x - a.x) * nx + (mid.y - a.y) * ny) / along

	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Clips a convex ring to one half-plane: Sutherland–Hodgman over a single edge.
 *
 * @internal
 */
function clipToHalf(ring: MapGround, mid: MapPoint2D, nx: number, ny: number): MapGround {
	const kept: MapGround = []

	for (const [index, a] of ring.entries()) {
		const b = ring[(index + 1) % ring.length]

		if (b === undefined) continue

		const aIn = nearer(a, mid, nx, ny)

		if (aIn) kept.push(a)

		// The crossing point joins the ring whichever way the edge is leaving or entering, which is what
		// keeps the result closed.
		if (aIn !== nearer(b, mid, nx, ny)) kept.push(crossing(a, b, mid, nx, ny))
	}

	return kept
}

/**
 * The ground a dot keeps, or `null` when no neighbor is close enough to want any of it.
 *
 * @param dot - The dot: its projected frame position, and the radius it paints at in device pixels.
 * @param neighbors - Every other drawn dot. Far ones are filtered here rather than by the caller, so
 * a caller can hand over a whole pool without measuring first.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The convex ring, or `null` to draw the target unclipped.
 *
 * @internal
 */
export function ownGround(
	dot: MapGroundDot,
	neighbors: readonly MapGroundDot[],
	unitsPerPixel: number,
): MapGround | null {
	const near = neighbors.filter((other) => contests(dot, other, unitsPerPixel))

	return near.length === 0 ? null : cutGround(dot, near, unitsPerPixel)
}

/**
 * The ground each dot of a set keeps, index for index with `dots`: {@link ownGround} for every dot
 * at once. A dot of the set is a neighbor of the others, and so is each dot in `others`.
 *
 * The pass indexes every dot through the shared grid, at one cell per widest pair of targets. A dot
 * therefore reads the nine cells around it rather than every other dot, so a set of hundreds is not
 * a quadratic scan on every regrouping.
 *
 * @param dots - The dots of the set, in the order they draw. A dot at `null` draws nothing, divides
 * nothing, and gets `null`.
 * @param others - The drawn dots of every other mark.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The ring of each dot, or `null` where it draws its target unclipped.
 *
 * @internal
 */
export function setGrounds(
	dots: readonly (MapGroundDot | null)[],
	others: readonly MapGroundDot[],
	unitsPerPixel: number,
): (MapGround | null)[] {
	const all = [...dots.filter((dot) => dot !== null), ...others]

	const widest = all.reduce((most, dot) => Math.max(most, targetReach(dot)), 0)

	const cell = 2 * widest * unitsPerPixel

	const cells = new Map<number, MapGroundDot[]>()

	for (const dot of all) bucket(cells, toCellKey(dot.at, cell)).push(dot)

	return dots.map((dot) => {
		if (dot === null) return null

		const near: MapGroundDot[] = []

		walkNear(cells, dot.at, cell, (other) => {
			if (contests(dot, other, unitsPerPixel)) near.push(other)

			// Never stops the walk: every contesting neighbor takes its own cut.
			return false
		})

		return near.length === 0 ? null : cutGround(dot, near, unitsPerPixel)
	})
}

/**
 * Where the cut between two dots crosses the line through their centers, as a fraction of the way
 * from `dot` to `other`.
 *
 * Midway, which is the line a reader could draw themselves, unless midway falls inside a face. A
 * summary can stand closer to a lone dot than its own radius doubled, because the grouping keeps
 * only a small gap between the edges. The cut then moves to the edge of that face, so every pixel
 * that a mark paints answers that mark. Where the two faces overlap, there is no line that keeps
 * both, and the cut stays midway.
 *
 * Both dots read the same line, which is what makes the division independent of draw order: the
 * cut from `other` is `apart - cut` from `dot`.
 *
 * @internal
 */
function cutAt(dot: MapGroundDot, other: MapGroundDot, unitsPerPixel: number): number {
	const apart = Math.sqrt(squared(dot.at, other.at))

	const own = dot.radius * unitsPerPixel

	const theirs = other.radius * unitsPerPixel

	const half = apart / 2

	const cut = own + theirs > apart ? half : clamp(half, own, apart - theirs)

	return cut / apart
}

/**
 * The ring a dot keeps against the neighbors that contest it.
 *
 * Starts from the square bounding the dot's own target, so the ring is finite for a `clipPath` to
 * draw. Every cut lands inside it, because a cut that contests the target at all crosses that
 * square. The circle supplies the curve; this supplies only the straight edges.
 *
 * @internal
 */
function cutGround(
	dot: MapGroundDot,
	near: readonly MapGroundDot[],
	unitsPerPixel: number,
): MapGround | null {
	const { at } = dot

	const reach = targetReach(dot) * unitsPerPixel

	let ring: MapGround = [
		{ x: at.x - reach, y: at.y - reach },
		{ x: at.x + reach, y: at.y - reach },
		{ x: at.x + reach, y: at.y + reach },
		{ x: at.x - reach, y: at.y + reach },
	]

	for (const other of near) {
		const dx = other.at.x - at.x

		const dy = other.at.y - at.y

		const t = cutAt(dot, other, unitsPerPixel)

		// The raw delta, not a unit normal: `nearer` reads only the sign of a dot product against it and
		// `crossing` reads a ratio of two, so any positive scaling cancels out of both. Normalizing would
		// buy a rounding step per neighbor to reach the same ring.
		ring = clipToHalf(ring, { x: at.x + dx * t, y: at.y + dy * t }, dx, dy)

		// Every cut passes on the far side of the dot's own position, so that position always survives
		// and the ring cannot empty. Bailing anyway rather than emitting a degenerate `points` list,
		// since a ring of under three points clips the target away entirely and would read as a dead pin.
		if (ring.length < 3) return null
	}

	return ring
}

/**
 * A ring as an SVG `points` attribute.
 *
 * Rounded to a hundredth of a frame unit, through the `round` the `d` builders take. The ring is
 * regenerated on every zoom notch and every refit. Full float expansion puts seventeen significant
 * figures per ordinate into the DOM, for a boundary no one can see to that precision.
 *
 * @internal
 */
export function groundPoints(ring: MapGround): string {
	return ring.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')
}
