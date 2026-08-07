import { describe, expect, it } from 'vitest'
import { clusterPoints, clusterRadius, groupsByMember } from '../../modules/map/map-cluster'
import { clusterAnchor, clusterSpan } from '../../modules/map/map-cluster-geo'
import { POINT_RADIUS } from '../../modules/map/map-constants'
import type { MapPoint2D } from '../../modules/map/map-geometry'
import type { LngLat } from '../../modules/map/types'

/** One frame unit per degree, so a reach reads straight off the coordinates. */
const flat = (position: LngLat): MapPoint2D => ({ x: position[0], y: position[1] })

/** The projection has no image past this meridian — the insets a US composite drops. */
const clipped = (position: LngLat): MapPoint2D | null => (position[0] > 100 ? null : flat(position))

/** The clear space between mark edges these fixtures group by. */
const GAP = 9

/** Two dots merge under their own widths plus the gap. */
const DOT_REACH = POINT_RADIUS * 2 + GAP

/** Ten dots in a row from `at`, enough of them to grade the mark up. */
const bunch = (at: number): LngLat[] =>
	Array.from({ length: 10 }, (_, step): LngLat => [at + step, 0])

/** Every drawn mark, with the radius it paints. */
const marksOf = (positions: LngLat[], gap: number | null) =>
	clusterPoints(positions, flat, gap).flatMap((group) =>
		group.at === null ? [] : [{ at: group.at, radius: clusterRadius(group.members.length) }],
	)

describe('clusterPoints', () => {
	it('groups the dots inside the reach and leaves the rest apart', () => {
		const groups = clusterPoints(
			[
				[0, 0],
				[10, 0],
				[20, 0],
				[400, 0],
			],
			flat,
			GAP,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 1, 2], [3]])
	})

	it('measures each dot from the first member of a group, never from a moving mean', () => {
		// A chain of dots one reach apart. Measured from the mean the broad phase
		// would creep along the chain; measured from the first member the third dot
		// is two reaches out and starts its own — and stays its own, because the
		// marks that result still stand clear of one another.
		const groups = clusterPoints(
			[
				[0, 0],
				[DOT_REACH, 0],
				[DOT_REACH * 2, 0],
			],
			flat,
			GAP,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 1], [2]])
	})

	it('draws a group at the mean of its members', () => {
		const [group] = clusterPoints(
			[
				[0, 0],
				[8, 0],
				[4, 12],
			],
			flat,
			GAP,
		)

		expect(group?.at).toEqual({ x: 4, y: 4 })
	})

	it('holds every point one per group with the grouping off', () => {
		// Off, two dots that plainly cover one another still draw as two: the
		// caller asked for every dot, and nothing may merge behind that.
		const positions: LngLat[] = [
			[0, 0],
			[1, 0],
			[2, 0],
		]

		const groups = clusterPoints(positions, flat, null)

		expect(groups.map((group) => group.members)).toEqual([[0], [1], [2]])
	})

	it('keeps a dot the projection drops as its own group, drawn nowhere', () => {
		// The group holds the readout: a stop the map cannot draw still owes the
		// table a row, and the dots around it must go on reporting the indices the
		// caller passed.
		const groups = clusterPoints(
			[
				[0, 0],
				[200, 0],
				[10, 0],
			],
			clipped,
			GAP,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 2], [1]])

		expect(groups[1]?.at).toBeNull()
	})

	it('merges the summaries whose marks would cover one another', () => {
		// Two bunches the broad phase keeps apart — their first members stand well
		// past a dot's reach — until ten stops each grade the marks up to where they
		// draw over the space between them.
		const reach = clusterRadius(10) * 2 + GAP

		expect(clusterPoints([...bunch(0), ...bunch(reach - 1)], flat, GAP)).toHaveLength(1)
	})

	it('leaves the summaries that stand clear of one another alone', () => {
		const reach = clusterRadius(10) * 2 + GAP

		expect(clusterPoints([...bunch(0), ...bunch(reach + 1)], flat, GAP)).toHaveLength(2)
	})

	it('leaves no two marks drawing over one another, however the merging chains', () => {
		// The rule the whole pass exists for, on a field dense enough to chain:
		// merging moves a centre and grades its mark up, which can then reach a
		// neighbour the broad phase left alone. However that settles, no pair of the
		// marks it draws may come within the gap of one another.
		const field: LngLat[] = []

		for (let x = 0; x < 10; x++) {
			for (let y = 0; y < 10; y++) field.push([x * 18, y * 18])
		}

		const marks = marksOf(field, GAP)

		expect(marks.length).toBeGreaterThan(1)

		for (const [index, mark] of marks.entries()) {
			for (const other of marks.slice(index + 1)) {
				const span = Math.hypot(mark.at.x - other.at.x, mark.at.y - other.at.y)

				expect(span).toBeGreaterThanOrEqual(mark.radius + other.radius + GAP)
			}
		}
	})
})

describe('clusterAnchor', () => {
	it('centres a group on its members', () => {
		const pair: LngLat[] = [
			[0, 0],
			[1, 0],
		]

		expect(clusterAnchor([0, 1], pair)[0]).toBeCloseTo(0.5, 6)
	})

	it('leaves a lone dot its own position', () => {
		expect(clusterAnchor([0], [[7, 3]])).toEqual([7, 3])
	})
})

describe('clusterSpan', () => {
	it('measures the diameter about the anchor', () => {
		const pair: LngLat[] = [
			[0, 0],
			[1, 0],
		]

		// A degree of longitude at the equator is ~111 km, and the span is the
		// diameter about the anchor — so the pair spans the degree between them.
		expect(clusterSpan([0, 1], pair)).toBeGreaterThan(111_000)

		expect(clusterSpan([0, 1], pair)).toBeLessThan(111_400)
	})

	it('spreads a lone dot over nothing, without a spherical pass', () => {
		expect(clusterSpan([0], [[7, 3]])).toBe(0)
	})
})

describe('clusterRadius', () => {
	it('grades the mark by how many stops it stands for', () => {
		expect(clusterRadius(1)).toBe(POINT_RADIUS)

		const grades = [2, 5, 10, 25].map(clusterRadius)

		expect(grades).toEqual([...grades].sort((a, b) => a - b))

		expect(new Set(grades).size).toBe(grades.length)
	})

	it('holds the top grade past the last step', () => {
		expect(clusterRadius(4_000)).toBe(clusterRadius(25))
	})
})

describe('groupsByMember', () => {
	// Two dots inside the reach and one clear of them: groups [0, 1] and [2].
	const groups = clusterPoints(
		[
			[0, 0],
			[1, 0],
			[100, 0],
		],
		flat,
		GAP,
	)

	it('reads back which drawn mark holds each dot, and holds none it never had', () => {
		// The resolution a pick needs: a click names the point a caller passed, and
		// the summary it merged into is what the map draws. Asserted whole, so the
		// entries it does not hold are proved by the same expectation.
		expect([...groupsByMember(groups)]).toEqual([
			[0, 0],
			[1, 0],
			[2, 1],
		])
	})
})
