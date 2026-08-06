import { describe, expect, it } from 'vitest'
import {
	clusterAnchor,
	clusterPoints,
	clusterRadius,
	clusterSpan,
} from '../../modules/map/map-cluster'
import { POINT_RADIUS } from '../../modules/map/map-constants'
import type { MapPoint2D } from '../../modules/map/map-geometry'
import type { LngLat } from '../../modules/map/types'

/** One frame unit per degree, so a merge distance reads straight off the coordinates. */
const flat = (position: LngLat): MapPoint2D => ({ x: position[0], y: position[1] })

/** The projection has no image past this meridian — the insets a US composite drops. */
const clipped = (position: LngLat): MapPoint2D | null => (position[0] > 100 ? null : flat(position))

describe('clusterPoints', () => {
	it('groups the dots inside the merge distance and leaves the rest apart', () => {
		const groups = clusterPoints(
			[
				[0, 0],
				[10, 0],
				[20, 0],
				[400, 0],
			],
			flat,
			20,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 1, 2], [3]])
	})

	it('measures each dot from the seed of a group, never from a moving mean', () => {
		// A chain of dots one merge distance apart. Measured from the mean the
		// group would creep along the chain and swallow it; measured from the seed
		// the third dot is two distances out and starts its own.
		const groups = clusterPoints(
			[
				[0, 0],
				[20, 0],
				[40, 0],
			],
			flat,
			20,
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
			20,
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

		const groups = clusterPoints(positions, flat, 0)

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
			20,
		)

		expect(groups.map((group) => group.members)).toEqual([[0, 2], [1]])

		expect(groups[1]?.at).toBeNull()
	})

	it('groups the same way across a cell boundary as within one', () => {
		// The grid buckets by merge distance and reads the nine cells around a
		// dot, so a pair straddling a boundary must group as one all the same.
		const groups = clusterPoints(
			[
				[19.9, 19.9],
				[20.1, 20.1],
			],
			flat,
			20,
		)

		expect(groups).toHaveLength(1)
	})

	it('merges the summaries whose marks would cover one another', () => {
		// Two bunches the seed rule keeps apart — their seeds stand 25 units off,
		// past the merge distance — but ten stops each grade the marks up until
		// they draw over the gap between them.
		const bunched: LngLat[] = [
			...Array.from({ length: 10 }, (_, step): LngLat => [step, 0]),
			...Array.from({ length: 10 }, (_, step): LngLat => [25 + step, 0]),
		]

		expect(clusterPoints(bunched, flat, 20)).toHaveLength(1)
	})

	it('leaves the summaries that clear one another alone', () => {
		const apart: LngLat[] = [
			...Array.from({ length: 10 }, (_, step): LngLat => [step, 0]),
			...Array.from({ length: 10 }, (_, step): LngLat => [45 + step, 0]),
		]

		expect(clusterPoints(apart, flat, 20)).toHaveLength(2)
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
