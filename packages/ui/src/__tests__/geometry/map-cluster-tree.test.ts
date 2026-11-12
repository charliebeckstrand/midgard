// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { clusterPoints } from '../../modules/map/engine/map-cluster/group'
import { groupSets } from '../../modules/map/engine/map-cluster/sets'
import { clusterTree, cutTree } from '../../modules/map/engine/map-cluster/tree'
import { POINT_CLUSTER_GAP } from '../../modules/map/engine/map-constants'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'
import { englishRadius, flatProjector } from '../helpers/map-flat'

/** The width of the canonical frame that these fixtures draw in. */
const FRAME = 1000

/** A seeded generator, so that a failure gives the same points again. */
function seeded(seed: number): () => number {
	let state = seed

	return () => {
		state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296

		return state / 4_294_967_296
	}
}

/** `count` points in towns: tight piles around a few centers, as places on a map stand. */
function towns(count: number, seed: number): LngLat[] {
	const random = seeded(seed)

	const centers = Array.from({ length: 8 }, (): LngLat => [random() * FRAME, random() * 600])

	return Array.from({ length: count }, (_, index): LngLat => {
		const [x, y] = centers[index % centers.length] as LngLat

		const spread = random() < 0.5 ? 4 : 60

		return [x + (random() - 0.5) * spread, y + (random() - 0.5) * spread]
	})
}

/** The members of each group, in order. */
function members(groups: readonly { members: number[] }[]): number[][] {
	return groups.map((group) => group.members)
}

/**
 * The groups of the measured frame `width` pixels wide: the canonical frame
 * scaled and moved, at one unit per pixel, as the browser groups it.
 */
function measured(positions: LngLat[], width: number): number[][] {
	const k = width / FRAME

	const project = (at: LngLat): MapPoint2D => ({ x: at[0] * k + 37.25, y: at[1] * k + 11.5 })

	const grouping = groupSets(
		[{ id: 'set', input: { positions, gap: POINT_CLUSTER_GAP } }],
		project,
		englishRadius,
		1,
	)

	return members(grouping.sets.get('set')?.groups ?? [])
}

describe('clusterTree', () => {
	it('gives each width the groups that the measured frame draws', () => {
		const random = seeded(7)

		for (const seed of [1, 2, 3, 4]) {
			const positions = towns(120, seed)

			// The tree of the canonical frame, down to a frame 100 pixels wide.
			const tree = clusterTree(
				positions,
				flatProjector,
				() => POINT_CLUSTER_GAP,
				POINT_CLUSTER_GAP,
				englishRadius,
				FRAME / 100,
			)

			for (let probe = 0; probe < 200; probe++) {
				const width = 100 + random() * 3000

				expect(members(cutTree(tree, FRAME / width))).toEqual(measured(positions, width))
			}
		}
	})

	it('only splits groups as the frame widens', () => {
		const positions = towns(120, 9)

		const tree = clusterTree(
			positions,
			flatProjector,
			() => POINT_CLUSTER_GAP,
			POINT_CLUSTER_GAP,
			englishRadius,
			FRAME / 100,
		)

		let narrow = cutTree(tree, FRAME / 100)

		for (let width = 110; width < 3000; width += 10) {
			const wide = cutTree(tree, FRAME / width)

			// Each group of the wider frame sits inside one group of the narrower one.
			for (const group of wide) {
				const host = narrow.find((each) => each.members.includes(group.members[0] ?? -1))

				expect(group.members.every((member) => host?.members.includes(member))).toBe(true)
			}

			narrow = wide
		}
	})
})

describe('clusterPoints', () => {
	it('groups alike wherever the frame puts its origin', () => {
		// Dense enough that a group often overlaps two hosts at once. The host was
		// the first that the walk of the grid met, and the cells move with the
		// origin, so about one moved frame in five grouped differently.
		for (let seed = 1; seed < 40; seed++) {
			const random = seeded(seed)

			const positions = Array.from({ length: 80 }, (): LngLat => [random() * 300, random() * 200])

			const moved = (shift: number) => (at: LngLat) => ({
				x: at[0] + shift,
				y: at[1] + shift * 0.7,
			})

			const base = members(
				clusterPoints(positions, flatProjector, POINT_CLUSTER_GAP, englishRadius),
			)

			for (const shift of [3.3, 17.9, 41.2, 88.8]) {
				expect(
					members(clusterPoints(positions, moved(shift), POINT_CLUSTER_GAP, englishRadius)),
				).toEqual(base)
			}
		}
	})
})
