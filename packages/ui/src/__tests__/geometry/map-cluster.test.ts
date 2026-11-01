// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type MapDotMark,
	markTargets,
	neighborRoom,
} from '../../modules/map/engine/map-cluster/crowd'
import { clusterAnchor, clusterSpan } from '../../modules/map/engine/map-cluster/geo'
import { clusterPoints, groupsByMember } from '../../modules/map/engine/map-cluster/group'
import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import {
	CLUSTER_COUNT_CHAR_WIDTH,
	CLUSTER_COUNT_INSET,
	CLUSTER_RADIUS_STEPS,
	POINT_HIT_RADIUS,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'
import { englishRadius, flatProjector } from '../helpers/map-flat'

/**
 * A spherical mean uses trigonometry, so the longitude of a cluster anchor
 * carries noise below this bound in degrees.
 */
const LONGITUDE_TOLERANCE = 5e-7

/** The projection has no image past this meridian: the insets a US composite drops. */
const clipped = (position: LngLat): MapPoint2D | null =>
	position[0] > 100 ? null : flatProjector(position)

/** The clear space between mark edges these fixtures group by. */
const GAP = 9

/** Two dots merge under their own widths plus the gap. */
const DOT_REACH = POINT_RADIUS * 2 + GAP

/** The radius of the top grade: what a summary of three digits draws at. */
const TOP_GRADE = CLUSTER_RADIUS_STEPS.at(-1)?.radius ?? POINT_RADIUS

/** The count label in Spanish, which groups from five digits and with a period. */
const spanishCount = new Intl.NumberFormat('es-ES').format

/** Ten dots in a row from `at`, enough of them to grade the mark up. */
const bunch = (at: number): LngLat[] =>
	Array.from({ length: 10 }, (_, step): LngLat => [at + step, 0])

/** Every drawn mark, with the radius it paints. */
const buildMarks = (positions: LngLat[], gap: number | null) =>
	clusterPoints(positions, flatProjector, gap, englishRadius).flatMap((group) =>
		group.at === null ? [] : [{ at: group.at, radius: englishRadius(group.members.length) }],
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
			flatProjector,
			GAP,
			englishRadius,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 1, 2], [3]])
	})

	it('measures each dot from the first member of a group, never from a moving mean', () => {
		// A chain of dots one reach apart. Measured from the mean the broad phase
		// would creep along the chain; measured from the first member the third dot
		// is two reaches out and starts its own, and stays its own, because the
		// marks that result still stand clear of one another.
		const groups = clusterPoints(
			[
				[0, 0],
				[DOT_REACH, 0],
				[DOT_REACH * 2, 0],
			],
			flatProjector,
			GAP,
			englishRadius,
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
			flatProjector,
			GAP,
			englishRadius,
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

		const groups = clusterPoints(positions, flatProjector, null, englishRadius)

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
			englishRadius,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 2], [1]])

		expect(groups[1]?.at).toBeNull()
	})

	it('merges the summaries whose marks would cover one another', () => {
		// Two bunches the broad phase keeps apart (their first members stand well
		// past a dot's reach) until ten stops each grade the marks up to where they
		// draw over the space between them.
		const reach = englishRadius(10) * 2 + GAP

		expect(
			clusterPoints([...bunch(0), ...bunch(reach - 1)], flatProjector, GAP, englishRadius),
		).toHaveLength(1)
	})

	it('leaves the summaries that stand clear of one another alone', () => {
		const reach = englishRadius(10) * 2 + GAP

		expect(
			clusterPoints([...bunch(0), ...bunch(reach + 1)], flatProjector, GAP, englishRadius),
		).toHaveLength(2)
	})

	it('merges two summaries whose counts grow them into one another', () => {
		// 1,200 stops each, packed onto one spot, with the two spots far enough apart
		// that summaries at the top grade would stand clear, but close enough that
		// the summaries the labels grow overlap.
		const pile = (x: number): LngLat[] => Array.from({ length: 1_200 }, (): LngLat => [x, 0])

		const apart = TOP_GRADE * 2 + GAP + 1

		expect(englishRadius(1_200) * 2 + GAP).toBeGreaterThan(apart)

		const groups = clusterPoints([...pile(0), ...pile(apart)], flatProjector, GAP, englishRadius)

		expect(groups.map((group) => group.members.length)).toEqual([2_400])
	})

	it('leaves no two marks drawing over one another, however the merging chains', () => {
		// The rule the whole pass exists for, on a field dense enough to chain:
		// merging moves a center and grades its mark up, which can then reach a
		// neighbor the broad phase left alone. However that settles, no pair of the
		// marks it draws may come within the gap of one another.
		const field: LngLat[] = []

		for (let x = 0; x < 10; x++) {
			for (let y = 0; y < 10; y++) field.push([x * 18, y * 18])
		}

		const marks = buildMarks(field, GAP)

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
	it('centers a group on its members', () => {
		const pair: LngLat[] = [
			[0, 0],
			[1, 0],
		]

		expect(clusterAnchor([0, 1], pair)[0]).toBeNear(0.5, LONGITUDE_TOLERANCE)
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
		// diameter about the anchor, so the pair spans the degree between them.
		expect(clusterSpan([0, 1], pair)).toBeGreaterThan(111_000)

		expect(clusterSpan([0, 1], pair)).toBeLessThan(111_400)
	})

	it('spreads a lone dot over nothing, without a spherical pass', () => {
		expect(clusterSpan([0], [[7, 3]])).toBe(0)
	})
})

describe('clusterRadius', () => {
	/** Half the label at the estimated width, plus the inset on its end. */
	const labelRadius = (label: string) =>
		(label.length * CLUSTER_COUNT_CHAR_WIDTH) / 2 + CLUSTER_COUNT_INSET

	it('grades the mark by how many stops it stands for', () => {
		expect(englishRadius(1)).toBe(POINT_RADIUS)

		const grades = [2, 5, 10, 25].map(englishRadius)

		expect(grades).toEqual([...grades].sort((a, b) => a - b))

		expect(new Set(grades).size).toBe(grades.length)
	})

	it('holds the top grade through every count of three digits', () => {
		expect(englishRadius(999)).toBe(TOP_GRADE)
	})

	it('grows a summary past the top grade to hold a longer count', () => {
		// `1,200` is five characters: wider than the top grade holds.
		expect(englishRadius(1_200)).toBe(labelRadius('1,200'))

		expect(englishRadius(1_200)).toBeGreaterThan(TOP_GRADE)

		expect(englishRadius(12_000)).toBe(labelRadius('12,000'))
	})

	it('sizes the summary to the label the locale writes', () => {
		// Spanish writes no separator under five digits, and a period from five up.
		expect(clusterRadius(1_200, spanishCount)).toBe(labelRadius('1200'))

		expect(clusterRadius(12_000, spanishCount)).toBe(labelRadius('12.000'))

		expect(clusterRadius(1_200, spanishCount)).toBeLessThan(englishRadius(1_200))
	})

	it('never shrinks as the count rises', () => {
		const counts = [1, 2, 9, 99, 999, 1_000, 9_999, 10_000, 99_999, 1_000_000]

		for (const format of [String, spanishCount]) {
			const radii = counts.map((count) => clusterRadius(count, format))

			expect(radii).toEqual([...radii].sort((a, b) => a - b))
		}
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
		flatProjector,
		GAP,
		englishRadius,
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

/** A dot of the default size at one frame position. */
const dot = (x: number): MapDotMark => ({ at: { x, y: 0 }, radius: POINT_RADIUS })

/**
 * How much reach the nearest neighbor leaves each drawn dot. Clustering has
 * already merged the marks that draw over one another; this asks the wider
 * question the hit targets read, so a pair a zoom has just parted stays
 * separately aimable.
 *
 * A dot with no neighbor inside its reach answers `Infinity` rather than the
 * finger target: this pass states a claim on the ground, and `markTargets` is the
 * one place that knows what a target caps at.
 */
describe('neighborRoom', () => {
	it('claims nothing of dots standing clear of one another', () => {
		// Past the reach plus the neighbor's own radius, so neither covers the face
		// of the other and neither has anything to say about the other's target.
		expect(neighborRoom([dot(0), dot(40)])).toEqual([Infinity, Infinity])
	})

	it('answers for each dot rather than for the set', () => {
		// The first pair stands at the gap a zoom leaves the moment a summary parts:
		// well inside 44px. Each dot reaches to the other's face and stops: 15px
		// between the centers, less the 5.5px the neighbor paints.
		expect(neighborRoom([dot(0), dot(15), dot(400)])).toEqual([9.5, 9.5, Infinity])
	})

	it('measures the neighbor’s own width, so a summary reaches further than a dot', () => {
		const summary: MapDotMark = { at: { x: 30, y: 0 }, radius: TOP_GRADE }

		// 30px apart: the summary's face reaches inside the dot's target, while the
		// dot's own face stays clear of the summary's. Each answers for what it
		// would swallow, not for what would swallow it.
		expect(neighborRoom([dot(0), summary])).toEqual([30 - TOP_GRADE, Infinity])
	})

	it('holds every reach in device pixels through a zoom', () => {
		// Under the transform one device pixel spans two frame units, so the pair a
		// zoom has carried 30 frame units apart still draws 15px apart on screen.
		expect(neighborRoom([dot(0), dot(30)], 2)).toEqual([9.5, 9.5])
	})

	it('crowds nothing with a dot the projection dropped', () => {
		expect(neighborRoom([{ at: null, radius: POINT_RADIUS }, dot(1)])).toEqual([Infinity, Infinity])
	})

	it('answers the same past the size where the pass indexes a grid', () => {
		// Nine dots and more read the grid rather than every pair. A row of pairs
		// 15px apart, each pair far from the next, and one dot the projection
		// dropped: the answers must be the ones the pairwise pass gives.
		const pairs = Array.from({ length: 5 }, (_, pair) => [dot(pair * 200), dot(pair * 200 + 15)])

		const marks = [...pairs.flat(), { at: null, radius: POINT_RADIUS }, dot(2000)]

		expect(neighborRoom(marks)).toEqual([...Array(10).fill(9.5), Infinity, Infinity])
	})

	it('reads the nearest neighbor through the grid, not the first one', () => {
		// The middle dot of a row stands 25px from one side and 15px from the other.
		// The nearer neighbor sets its room, whichever cell the walk reads first.
		const row = [
			dot(0),
			dot(25),
			dot(40),
			...Array.from({ length: 6 }, (_, step) => dot(1000 + step * 500)),
		]

		expect(neighborRoom(row).slice(0, 3)).toEqual([25 - POINT_RADIUS, 9.5, 9.5])
	})

	it('holds every reach in device pixels through a zoom past the grid size', () => {
		const row = Array.from({ length: 10 }, (_, step) => dot(step * 30))

		expect(neighborRoom(row, 2)).toEqual(Array(10).fill(9.5))
	})

	it('leaves a lone dot alone', () => {
		expect(neighborRoom([dot(0)])).toEqual([Infinity])

		expect(neighborRoom([])).toEqual([])
	})
})

/**
 * The one rule every dot-shaped mark sizes its pointer target by. Two claims on
 * the ground under a dot arrive as the same measure (a reach in device pixels)
 * so the join is their minimum, floored at what the dot paints and capped at the
 * reach a finger takes.
 */
describe('markTargets', () => {
	/** A zone that spares every dot the same room, whatever the position. */
	const spares = (room: number) => () => room

	/** The plat's answer where no zone is drawn at all: the identity of its fold. */
	const open = spares(Number.POSITIVE_INFINITY)

	it('keeps the whole target where nothing claims the ground', () => {
		// Both claims arrive unbounded, so the cap is the only thing left to answer,
		// which is what says the cap lives here and nowhere below.
		expect(markTargets([dot(0)], 1, open)).toEqual([POINT_HIT_RADIUS])
	})

	it('takes the tighter of the zone’s budget and the neighbor’s gap', () => {
		// The neighbor leaves 9.5px and the zone spares 14px, so the neighbor
		// decides, and the reverse pairing proves the minimum runs both ways.
		expect(markTargets([dot(0), dot(15)], 1, spares(14))).toEqual([9.5, 9.5])

		expect(markTargets([dot(0), dot(15)], 1, spares(4))).toEqual([5.5, 5.5])
	})

	it('floors the target at the radius the dot draws', () => {
		// A zone smaller than the mark on it would leave the dot a dead rim, so the
		// zone gives way: a dot no one can point at reports nothing at all.
		const summary: MapDotMark = { at: { x: 0, y: 0 }, radius: TOP_GRADE }

		expect(markTargets([summary], 1, spares(2))).toEqual([TOP_GRADE])
	})

	it('takes the whole of a summary wider than the finger target', () => {
		// A count of seven characters grows the dot past the 22px cap, and a target
		// held at the cap would leave the dot a dead rim.
		const wide = englishRadius(120_000)

		expect(wide).toBeGreaterThan(POINT_HIT_RADIUS)

		const summary: MapDotMark = { at: { x: 0, y: 0 }, radius: wide }

		expect(markTargets([summary], 1, open)).toEqual([wide])
	})

	it('floors the target at the dot without asking the zone, where a neighbor already did', () => {
		// 10px apart, so the neighbor leaves 4.5px, less than the 5.5px each dot
		// paints. The floor decides, and the zone is not asked at all.
		const asked: MapPoint2D[] = []

		const spare = (at: MapPoint2D) => {
			asked.push(at)

			return Number.POSITIVE_INFINITY
		}

		expect(markTargets([dot(0), dot(10)], 1, spare)).toEqual([POINT_RADIUS, POINT_RADIUS])

		expect(asked).toEqual([])
	})

	it('gives a dot the projection dropped the whole target, unmeasured', () => {
		// It draws nothing and stands nowhere, so no zone and no neighbor can be
		// asked about it.
		expect(markTargets([{ at: null, radius: POINT_RADIUS }], 1, spares(2))).toEqual([
			POINT_HIT_RADIUS,
		])
	})
})
