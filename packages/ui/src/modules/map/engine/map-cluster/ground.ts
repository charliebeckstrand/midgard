/**
 * Which part of the ground under a dot's pointer target belongs to that dot, when another dot stands
 * close enough to want some of it.
 *
 * The companion to `crowd.ts`, answering the same question — how much of this ground is mine — with a
 * shape instead of a radius. A radius is the right answer for a zone's claim: a `MapGeofence` is a
 * face, not a point, so there is no line to divide along and a dot standing on one can only give
 * reach back evenly. It is the wrong answer for a neighbouring DOT. Shrinking both targets to the gap
 * costs each of them reach in every direction, including the three quarters of the compass where
 * nothing is competing for anything, so two dots twenty pixels apart end up with targets a reader has
 * to aim at precisely — in exchange for an ambiguity that only ever existed between them.
 *
 * A dot's ground is instead its full target MINUS whatever lies nearer to a neighbour. The boundary
 * between two dots is the perpendicular bisector of the segment joining them, so each keeps the whole
 * of its finger target outward and the contested middle divides once, evenly, along a line a reader
 * could have drawn themselves. Which is also the only division that cannot depend on draw order:
 * before this, the overlap belonged to whichever dot happened to render last, so the pin underneath
 * silently lost a crescent of its target and its tooltip with it.
 *
 * The result is a convex polygon rather than the true circle-minus-lens: the target is a `<circle>`
 * under a `clip-path`, so the arc comes from the circle and this supplies only the straight cuts.
 * Convexity is what makes that sound — a half-plane intersection is always convex, and clipping a
 * convex region by another half-plane keeps it so, however many neighbours crowd in.
 *
 * Frame arithmetic, React-free, like the rest of the engine.
 */

import { round } from '../map-geometry/mark'
import type { MapOverlayEntry } from '../map-overlay/entry'
import type { LngLat, MapPoint2D } from '../types'
import { squared } from './grid'

/**
 * A dot's own ground, as a closed convex ring in frame units — what a `clipPath` draws.
 *
 * @internal
 */
export type MapGround = MapPoint2D[]

/**
 * How near two dots must be before the bisector cuts into the target at all.
 *
 * A bisector sits half the gap away, so it crosses a target of radius `reach` exactly when the gap is
 * under `2 * reach`. Below that there is nothing to divide and the dot keeps its plain circle, which
 * is the case almost every dot on almost every map is in — hence {@link ownGround} returning `null`
 * rather than a ring covering everything, so the overwhelmingly common answer costs no polygon, no
 * `clipPath` element and no id.
 *
 * @internal
 */
function contests(at: MapPoint2D, other: MapPoint2D, reach: number): boolean {
	const apart = squared(at, other)

	// Coincident dots are excluded, not divided: the bisector of a zero-length segment has no
	// direction, and two dots at one position are not tellable apart by any geometry. `group.ts`
	// merges those into one summary where it can see them; where it cannot, an overlap a reader
	// cannot perceive is better than a cut in an arbitrary direction.
	return apart > 0 && apart < 4 * reach * reach
}

/** Whether `p` is on `at`'s side of the bisector — ties fall inside, so a boundary point is owned. @internal */
function nearer(p: MapPoint2D, mid: MapPoint2D, nx: number, ny: number): boolean {
	return (p.x - mid.x) * nx + (p.y - mid.y) * ny <= 0
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
 * Clips a convex ring to one half-plane — Sutherland–Hodgman over a single edge.
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
 * The ground a dot keeps, or `null` when no neighbour is close enough to want any of it.
 *
 * Starts from the square bounding the dot's own target, so the ring is finite for a `clipPath` to
 * draw, and every cut lands inside it — a bisector that contests the target at all crosses that
 * square. The circle supplies the curve; this supplies only the straight edges.
 *
 * @param at - The dot's projected frame position.
 * @param neighbours - Every other drawn dot's frame position. Far ones are filtered here rather than
 * by the caller, so a caller can hand over a whole cell's worth without measuring first.
 * @param reach - The dot's target radius, in the same frame units as the positions.
 * @returns The convex ring, or `null` to draw the target unclipped.
 *
 * @internal
 */
export function ownGround(
	at: MapPoint2D,
	neighbours: readonly MapPoint2D[],
	reach: number,
): MapGround | null {
	const near = neighbours.filter((other) => contests(at, other, reach))

	if (near.length === 0) return null

	let ring: MapGround = [
		{ x: at.x - reach, y: at.y - reach },
		{ x: at.x + reach, y: at.y - reach },
		{ x: at.x + reach, y: at.y + reach },
		{ x: at.x - reach, y: at.y + reach },
	]

	for (const other of near) {
		const dx = other.x - at.x

		const dy = other.y - at.y

		const gap = Math.sqrt(dx * dx + dy * dy)

		ring = clipToHalf(ring, { x: at.x + dx / 2, y: at.y + dy / 2 }, dx / gap, dy / gap)

		// Every cut passes within `reach` of the centre, so the dot's own position always survives and
		// the ring cannot empty. Bailing anyway rather than emitting a degenerate `points` list, since
		// a ring of under three points clips the target away entirely and would read as a dead pin.
		if (ring.length < 3) return null
	}

	return ring
}

/**
 * A ring as an SVG `points` attribute.
 *
 * Rounded to a hundredth of a frame unit, through the `round` the `d` builders take: the ring is
 * regenerated on every zoom notch and every refit, and full float expansion puts seventeen
 * significant figures per ordinate into the DOM for a boundary no one can see to that precision.
 *
 * @internal
 */
export function groundPoints(ring: MapGround): string {
	return ring.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')
}

/**
 * One drawn dot in the pool, beside the id of the mark that drew it.
 *
 * Tagged rather than pre-filtered so the whole map's dots are gathered ONCE and each asking mark drops
 * its own from the finished pool — see {@link pooledDots}.
 *
 * @internal
 */
export type MapPooledDot = { owner: string; at: MapPoint2D }

/**
 * Every visible dot-drawing mark's stops, projected into frame units — the pool a mark divides its
 * targets' ground against, once its own dots are dropped from it.
 *
 * Gathers the whole map rather than taking an exclusion, because gathering is the expensive half: it
 * invokes each entry's `stopsAt`, which `MapPoints` registers as a thunk so that its O(N) build and the
 * spherical centroid behind every summary's anchor land on the one reader that wants them. Built per
 * asking mark, M marks would trigger that pass M times over the same entries and keep a different
 * (M-1)th of the answer each time.
 *
 * Skips hidden marks, which hold no ground while the legend has them away. Skips the line and area
 * kinds: a route's waypoints and a zone's ring paint nothing a pointer could be aimed at instead of,
 * and a zone's claim on the ground is a `spare` budget rather than a boundary. Read as a negative so a
 * dot-drawing kind added later joins the rule without this being edited.
 *
 * Off-projection stops are dropped — they draw nothing, so they crowd nothing; the US composite drops
 * points outside its insets.
 *
 * @internal
 */
export function pooledDots(
	entries: readonly MapOverlayEntry[],
	hidden: ReadonlySet<string>,
	project: (at: LngLat) => MapPoint2D | null,
): MapPooledDot[] {
	const pool: MapPooledDot[] = []

	for (const entry of entries) {
		if (hidden.has(entry.id)) continue

		if (entry.kind === 'route' || entry.kind === 'geofence') continue

		for (const stop of entry.stopsAt()) {
			const at = project(stop)

			if (at !== null) pool.push({ owner: entry.id, at })
		}
	}

	return pool
}
