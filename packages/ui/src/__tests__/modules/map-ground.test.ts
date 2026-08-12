import { describe, expect, it } from 'vitest'
import { groundPoints, ownGround } from '../../modules/map/engine/map-cluster/ground'
import type { MapPoint2D } from '../../modules/map/engine/types'

/**
 * A dot's pointer target keeps its whole outward reach and gives up only the ground lying nearer to a
 * neighbour. These pin the two properties that matter and cannot be seen in a screenshot: the cut
 * lands exactly midway, and it is the same cut from both sides — so the overlap belongs to neither dot
 * by draw order, which is how the pin drawn underneath used to lose a crescent of its target and its
 * tooltip with it.
 */

const REACH = 22

/** Whether `p` is inside a convex ring — every edge's left side, for a counter-clockwise winding. */
function inside(ring: MapPoint2D[], p: MapPoint2D): boolean {
	let sign = 0

	for (const [index, a] of ring.entries()) {
		const b = ring[(index + 1) % ring.length]

		if (b === undefined) continue

		const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)

		if (Math.abs(cross) < 1e-9) continue

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
		expect(ownGround({ x: 100, y: 100 }, [], REACH)).toBeNull()
	})

	it('leaves a dot unclipped when the neighbour is beyond both targets', () => {
		// A bisector sits half the gap away, so it only reaches the target when the gap is under 2r.
		expect(ownGround({ x: 0, y: 0 }, [{ x: 2 * REACH + 1, y: 0 }], REACH)).toBeNull()
	})

	it('clips as soon as the targets would overlap', () => {
		expect(ownGround({ x: 0, y: 0 }, [{ x: 2 * REACH - 1, y: 0 }], REACH)).not.toBeNull()
	})

	it('cuts exactly midway between two dots', () => {
		const ring = ownGround({ x: 0, y: 0 }, [{ x: 30, y: 0 }], REACH)

		expect(ring).not.toBeNull()

		// Just inside the midpoint is mine; just past it is not. The gap is 30, so the boundary is x=15.
		expect(inside(ring ?? [], { x: 14.9, y: 0 })).toBe(true)

		expect(inside(ring ?? [], { x: 15.1, y: 0 })).toBe(false)
	})

	it('keeps the full outward reach on the uncontested side', () => {
		const ring = ownGround({ x: 0, y: 0 }, [{ x: 30, y: 0 }], REACH)

		// The whole point of clipping rather than shrinking: away from the neighbour the target is
		// untouched, so three quarters of the compass keeps its finger-sized reach.
		expect(inside(ring ?? [], { x: -REACH + 0.5, y: 0 })).toBe(true)

		expect(inside(ring ?? [], { x: 0, y: REACH - 0.5 })).toBe(true)

		expect(inside(ring ?? [], { x: 0, y: -REACH + 0.5 })).toBe(true)
	})

	it('divides the contested ground between the two dots and gives it to exactly one', () => {
		const a = { x: 0, y: 0 }

		const b = { x: 30, y: 0 }

		const groundA = ownGround(a, [b], REACH) ?? []

		const groundB = ownGround(b, [a], REACH) ?? []

		// Sampled across the whole strip both targets reach: every point belongs to one dot and never to
		// both. Before this the overlap belonged to whichever drew last.
		for (let x = -REACH; x <= 30 + REACH; x += 1.5) {
			for (let y = -REACH; y <= REACH; y += 1.5) {
				const p = { x, y }

				const inA = inside(groundA, p) && (x - a.x) ** 2 + (y - a.y) ** 2 <= REACH * REACH

				const inB = inside(groundB, p) && (x - b.x) ** 2 + (y - b.y) ** 2 <= REACH * REACH

				expect(inA && inB).toBe(false)
			}
		}
	})

	it('cuts on the diagonal for a diagonal neighbour', () => {
		const ring = ownGround({ x: 0, y: 0 }, [{ x: 20, y: 20 }], REACH) ?? []

		// The bisector is perpendicular to the segment, so the midpoint is the boundary whatever the
		// bearing — a rule stated once rather than per axis.
		expect(inside(ring, { x: 9, y: 9 })).toBe(true)

		expect(inside(ring, { x: 11, y: 11 })).toBe(false)

		// And the perpendicular direction is untouched.
		expect(inside(ring, { x: -15, y: 15 })).toBe(true)
	})

	it('takes a cut from every crowding neighbour', () => {
		const ring =
			ownGround(
				{ x: 0, y: 0 },
				[
					{ x: 24, y: 0 },
					{ x: 0, y: 24 },
					{ x: -24, y: 0 },
				],
				REACH,
			) ?? []

		expect(inside(ring, { x: 13, y: 0 })).toBe(false)

		expect(inside(ring, { x: 0, y: 13 })).toBe(false)

		expect(inside(ring, { x: -13, y: 0 })).toBe(false)

		// The one quarter nothing contests keeps its reach.
		expect(inside(ring, { x: 0, y: -20 })).toBe(true)
	})

	it('ignores a coincident neighbour rather than cutting in an arbitrary direction', () => {
		// A zero-length segment has no bisector, and two dots at one position are not tellable apart by
		// any geometry. An imperceptible overlap beats a cut with no defensible direction.
		expect(ownGround({ x: 10, y: 10 }, [{ x: 10, y: 10 }], REACH)).toBeNull()
	})

	it('never returns a degenerate ring, however crowded', () => {
		const crowd = Array.from({ length: 12 }, (_, i) => ({
			x: Math.cos((i / 12) * Math.PI * 2) * 2,
			y: Math.sin((i / 12) * Math.PI * 2) * 2,
		}))

		const ring = ownGround({ x: 0, y: 0 }, crowd, REACH)

		// Twelve neighbours a pixel or two away is a pathological case a real map reaches through a
		// zoom-out. Either a usable ring or `null` — never a two-point sliver, which would clip the
		// target away entirely and read as a dead pin.
		expect(ring === null || ring.length >= 3).toBe(true)
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
