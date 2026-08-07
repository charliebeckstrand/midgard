/**
 * The broad phase, and the group-under-construction it builds. A dot within
 * `reach` of a group's first member joins it; every other dot starts its own.
 *
 * This pass can only merge dots the overlap rule (`merge.ts`) would merge
 * anyway, so it takes the count down cheaply and never decides the result on
 * its own. The seed algebra beside it — the running centre, the squared
 * distance, the fold of one group into another — lives here because both phases
 * measure through it.
 */

import type { LngLat, MapPoint2D } from '../types'
import { bucket, cellOf, walkNear } from './grid'

/** A group under construction: where the broad phase measures from, and the running sum of its members. @internal */
export type MapClusterSeed = {
	members: number[]
	/** The first member's projected position, `null` where the projection dropped it. */
	seed: MapPoint2D | null
	sumX: number
	sumY: number
}

/** A group with a position on the frame — the only kind either index holds. @internal */
type MapSeededCluster = MapClusterSeed & { seed: MapPoint2D }

/**
 * The broad phase: dots within `reach` of a group's first member join it, and
 * every other dot starts its own.
 *
 * Measuring from a fixed first member rather than from the group's moving mean
 * is what makes the `grid.ts` lookup exact — a mean that drifted as members
 * landed could leave a group in a different cell from the one its own lookup
 * keys name. It also merges strictly less than the overlap rule does, since two
 * dots inside `reach` are two marks inside their own: this pass can only take
 * work off the merge round, never decide against it.
 *
 * @internal
 */
export function seedGroups(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	reach: number,
): MapClusterSeed[] {
	const groups: MapClusterSeed[] = []

	// Seeds filed into the shared grid (`grid.ts`), at one cell per reach.
	const cells = new Map<number, MapSeededCluster[]>()

	for (const [index, position] of positions.entries()) {
		const at = project(position)

		// A dot the projection drops joins nothing and is joined by nothing: it
		// stays off the index, so it can never be found as a candidate.
		if (at === null) {
			groups.push({ members: [index], seed: null, sumX: 0, sumY: 0 })

			continue
		}

		const nearest = nearestSeed(cells, at, reach)

		if (nearest !== null) {
			nearest.members.push(index)

			nearest.sumX += at.x

			nearest.sumY += at.y

			continue
		}

		const group: MapSeededCluster = { members: [index], seed: at, sumX: at.x, sumY: at.y }

		groups.push(group)

		bucket(cells, cellOf(at, reach)).push(group)
	}

	return groups
}

/**
 * The nearest group whose first member lies within `reach` of `at`, or `null`
 * where the dot stands alone. Distance is compared squared, so the scan takes no
 * square root, and a tie keeps the earlier group — the grouping then reads the
 * same on every pass over the same input.
 *
 * @internal
 */
function nearestSeed(
	cells: Map<number, MapSeededCluster[]>,
	at: MapPoint2D,
	reach: number,
): MapSeededCluster | null {
	const limit = reach * reach

	let nearest: MapSeededCluster | null = null

	let best = Number.POSITIVE_INFINITY

	walkNear(cells, at, reach, (group) => {
		const spread = squared(group.seed, at)

		if (spread > limit || spread >= best) return false

		best = spread

		nearest = group

		return false
	})

	return nearest
}

/** One group folded into another, leaving both operands untouched. @internal */
export function absorb(host: MapClusterSeed, group: MapClusterSeed): MapClusterSeed {
	return {
		// Sorted, so the group still reports the caller's lowest index first — the
		// stop a pick names, and the ordinal an unnamed dot reads out by.
		members: [...host.members, ...group.members].sort((a, b) => a - b),
		seed: host.seed,
		sumX: host.sumX + group.sumX,
		sumY: host.sumY + group.sumY,
	}
}

/** Where a group draws: the mean of its members' projected positions. @internal */
export function centre({ members, seed, sumX, sumY }: MapClusterSeed): MapPoint2D | null {
	return seed === null ? null : { x: sumX / members.length, y: sumY / members.length }
}

/** The squared distance between two frame points, so a comparison takes no square root. @internal */
export function squared(a: MapPoint2D, b: MapPoint2D): number {
	const dx = a.x - b.x

	const dy = a.y - b.y

	return dx * dx + dy * dy
}
