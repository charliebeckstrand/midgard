// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	groundPoints,
	type MapGroundDot,
	ownGround,
	setGrounds,
} from '../../modules/map/engine/map-cluster/ground'
import { POINT_HIT_RADIUS, POINT_RADIUS } from '../../modules/map/engine/map-constants'
import type { MapPoint2D } from '../../modules/map/engine/types'
import { FLOAT } from '../helpers/geometry/tolerance'

/**
 * A dot's pointer target keeps its whole outward reach and gives up only the ground lying nearer to a
 * neighbor. These pin the two properties that matter and cannot be seen in a screenshot: the cut
 * lands exactly midway, and it is the same cut from both sides, so the overlap belongs to neither dot
 * by draw order, which is how the pin drawn underneath used to lose a crescent of its target and its
 * tooltip with it.
 */

const REACH = POINT_HIT_RADIUS

/** A lone dot at a frame position. */
function lone(at: MapPoint2D, radius = POINT_RADIUS): MapGroundDot {
	return { at, radius }
}

/** The ground of a lone dot among lone dots, at rest. */
function readGround(at: MapPoint2D, neighbors: MapPoint2D[]) {
	return ownGround(
		lone(at),
		neighbors.map((other) => lone(other)),
		1,
	)
}

/** Whether `point` is inside a convex ring: every edge's left side, for a counter-clockwise winding. */
function inside(ring: MapPoint2D[], point: MapPoint2D): boolean {
	let sign = 0

	for (const [index, a] of ring.entries()) {
		const b = ring[(index + 1) % ring.length]

		if (b === undefined) continue

		const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)

		if (Math.abs(cross) < FLOAT) continue

		const at = cross > 0 ? 1 : -1

		if (sign === 0) sign = at
		else if (sign !== at) return false
	}

	return true
}

describe('ownGround', () => {
	it('leaves a lone dot unclipped', () => {
		// The answer for almost every dot on almost every map, and the reason it is `null` rather than a
		// ring covering everything: no polygon, no clipPath element, no id.
		expect(readGround({ x: 100, y: 100 }, [])).toBeNull()
	})

	it('leaves a dot unclipped when the neighbor is beyond both targets', () => {
		// A bisector sits half the gap away, so it only reaches the target when the gap is under 2r.
		expect(readGround({ x: 0, y: 0 }, [{ x: 2 * REACH + 1, y: 0 }])).toBeNull()
	})

	it('clips as soon as the targets would overlap', () => {
		expect(readGround({ x: 0, y: 0 }, [{ x: 2 * REACH - 1, y: 0 }])).not.toBeNull()
	})

	it('cuts exactly midway between two dots', () => {
		const ring = readGround({ x: 0, y: 0 }, [{ x: 30, y: 0 }])

		expect(ring).not.toBeNull()

		// Just inside the midpoint is mine; just past it is not. The gap is 30, so the boundary is x=15.
		expect(inside(ring ?? [], { x: 14.9, y: 0 })).toBe(true)

		expect(inside(ring ?? [], { x: 15.1, y: 0 })).toBe(false)
	})

	it('keeps the full outward reach on the uncontested side', () => {
		const ring = readGround({ x: 0, y: 0 }, [{ x: 30, y: 0 }])

		// The whole point of clipping rather than shrinking: away from the neighbor the target is
		// untouched, so three quarters of the compass keeps its finger-sized reach.
		expect(inside(ring ?? [], { x: -REACH + 0.5, y: 0 })).toBe(true)

		expect(inside(ring ?? [], { x: 0, y: REACH - 0.5 })).toBe(true)

		expect(inside(ring ?? [], { x: 0, y: -REACH + 0.5 })).toBe(true)
	})

	it('divides the contested ground between the two dots and gives it to exactly one', () => {
		const a = { x: 0, y: 0 }

		const b = { x: 30, y: 0 }

		const groundA = readGround(a, [b]) ?? []

		const groundB = readGround(b, [a]) ?? []

		// Sampled across the whole strip both targets reach: every point belongs to one dot and never to
		// both. Before this the overlap belonged to whichever drew last.
		for (let x = -REACH; x <= 30 + REACH; x += 1.5) {
			for (let y = -REACH; y <= REACH; y += 1.5) {
				const point = { x, y }

				const inA = inside(groundA, point) && (x - a.x) ** 2 + (y - a.y) ** 2 <= REACH * REACH

				const inB = inside(groundB, point) && (x - b.x) ** 2 + (y - b.y) ** 2 <= REACH * REACH

				expect(inA && inB).toBe(false)
			}
		}
	})

	it('cuts on the diagonal for a diagonal neighbor', () => {
		const ring = readGround({ x: 0, y: 0 }, [{ x: 20, y: 20 }]) ?? []

		// The bisector is perpendicular to the segment, so the midpoint is the boundary whatever the
		// bearing: a rule stated once rather than per axis.
		expect(inside(ring, { x: 9, y: 9 })).toBe(true)

		expect(inside(ring, { x: 11, y: 11 })).toBe(false)

		// And the perpendicular direction is untouched.
		expect(inside(ring, { x: -15, y: 15 })).toBe(true)
	})

	it('takes a cut from every crowding neighbor', () => {
		const ring =
			readGround({ x: 0, y: 0 }, [
				{ x: 24, y: 0 },
				{ x: 0, y: 24 },
				{ x: -24, y: 0 },
			]) ?? []

		expect(inside(ring, { x: 13, y: 0 })).toBe(false)

		expect(inside(ring, { x: 0, y: 13 })).toBe(false)

		expect(inside(ring, { x: -13, y: 0 })).toBe(false)

		// The one quarter nothing contests keeps its reach.
		expect(inside(ring, { x: 0, y: -20 })).toBe(true)
	})

	it('ignores a coincident neighbor rather than cutting in an arbitrary direction', () => {
		// A zero-length segment has no bisector, and two dots at one position are not tellable apart by
		// any geometry. An imperceptible overlap beats a cut with no defensible direction.
		expect(readGround({ x: 10, y: 10 }, [{ x: 10, y: 10 }])).toBeNull()
	})

	it('never returns a degenerate ring, however crowded', () => {
		const crowd = Array.from({ length: 12 }, (_, index) => ({
			x: Math.cos((index / 12) * Math.PI * 2) * 2,
			y: Math.sin((index / 12) * Math.PI * 2) * 2,
		}))

		const ring = readGround({ x: 0, y: 0 }, crowd)

		// Twelve neighbors a pixel or two away is a pathological case a real map reaches through a
		// zoom-out. Either a usable ring or `null`: never a two-point sliver, which would clip the
		// target away entirely and read as a dead pin.
		expect(ring?.length ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(3)
	})
})

describe('ownGround beside a wider face', () => {
	it('moves the cut to the edge of a summary that midway falls inside', () => {
		// A summary at its top grade beside a lone dot, with the grouping's small gap between the faces.
		// Midway is 11.75 from the summary, inside its 15px face, so the cut moves out to that edge.
		const summary = lone({ x: 0, y: 0 }, 15)

		const dot = lone({ x: 23.5, y: 0 })

		const summaryGround = ownGround(summary, [dot], 1) ?? []

		const dotGround = ownGround(dot, [summary], 1) ?? []

		expect(inside(summaryGround, { x: 14.9, y: 0 })).toBe(true)

		expect(inside(summaryGround, { x: 15.1, y: 0 })).toBe(false)

		// The dot takes the rest, out to the summary's edge, and keeps its own face whole.
		expect(inside(dotGround, { x: 15.1, y: 0 })).toBe(true)

		expect(inside(dotGround, { x: 14.9, y: 0 })).toBe(false)
	})

	it('cuts midway where the two faces overlap', () => {
		// No line keeps both faces whole, so the division falls back to the even one.
		const ring = ownGround(lone({ x: 0, y: 0 }, 15), [lone({ x: 18, y: 0 })], 1) ?? []

		expect(inside(ring, { x: 8.9, y: 0 })).toBe(true)

		expect(inside(ring, { x: 9.1, y: 0 })).toBe(false)
	})

	it('measures the faces and the reach in device pixels under a zoom', () => {
		// At twice the scale, 15 frame units are 30px: the targets overlap, and the cut stays midway.
		const ring = ownGround(lone({ x: 0, y: 0 }), [lone({ x: 15, y: 0 })], 0.5) ?? []

		expect(inside(ring, { x: 7.4, y: 0 })).toBe(true)

		expect(inside(ring, { x: 7.6, y: 0 })).toBe(false)

		// 25 frame units are 50px, past both 22px targets.
		expect(ownGround(lone({ x: 0, y: 0 }), [lone({ x: 25, y: 0 })], 0.5)).toBeNull()
	})
})

describe('setGrounds', () => {
	it('divides a set as ownGround divides each of its dots', () => {
		// A row of dots and summaries a few pixels apart, past the size where the pass indexes them,
		// and one mark of another set beside the row.
		const dots = Array.from({ length: 24 }, (_, index) =>
			index === 5 ? null : lone({ x: index * 19, y: (index % 3) * 7 }, index % 4 === 0 ? 9 : 5.5),
		)

		const others = [lone({ x: 40, y: 20 })]

		const grounds = setGrounds(dots, others, 1)

		for (const [index, dot] of dots.entries()) {
			if (dot === null) {
				expect(grounds[index]).toBeNull()

				continue
			}

			const neighbors = [
				...dots.filter((other): other is MapGroundDot => other !== null && other !== dot),
				...others,
			]

			const alone = ownGround(dot, neighbors, 1)

			const ground = grounds[index] ?? null

			// The pass meets the neighbors in another order, so the rings can start at another vertex. The
			// ground they bound is what has to agree.
			expect(ground === null).toBe(alone === null)

			if (ground === null || alone === null) continue

			for (let dx = -REACH; dx <= REACH; dx += 2) {
				for (let dy = -REACH; dy <= REACH; dy += 2) {
					const point = { x: dot.at.x + dx + 0.5, y: dot.at.y + dy + 0.5 }

					expect(inside(ground, point)).toBe(inside(alone, point))
				}
			}
		}
	})
})

describe('groundPoints', () => {
	it('renders a ring as an SVG points attribute', () => {
		expect(
			groundPoints([
				{ x: 1, y: 2 },
				{ x: 3, y: 4 },
			]),
		).toBe('1,2 3,4')
	})

	it('rounds to a hundredth of a frame unit', () => {
		// The ring regenerates on every zoom notch; full float expansion would put seventeen significant
		// figures per ordinate into the DOM for a boundary invisible past two.
		expect(groundPoints([{ x: 1 / 3, y: 2 / 3 }])).toBe('0.33,0.67')
	})
})
