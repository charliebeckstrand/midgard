/**
 * The narrow phase, and the one rule the whole grouping obeys: no two marks
 * draw within `gap` of one another ({@link marksOverlap}). Everything above it
 * only decides how few pairs have to be asked.
 *
 * A merge moves a group's centre and grades its mark up, so the overlapping
 * pairs change as merges land — the rule is a fixpoint, not a single sweep.
 */

import type { MapPoint2D } from '../types'
import { bucket, cellOf, walkNear } from './grid'
import { clusterRadius, MAX_CLUSTER_RADIUS } from './radius'
import { absorb, centre, type MapClusterSeed, squared } from './seed'

/** Where a group draws and how wide it paints: what the overlap rule reads. @internal */
type MapClusterMark = {
	at: MapPoint2D
	radius: number
}

/**
 * Merges the groups whose marks draw within `gap` of one another, until none do.
 *
 * Each round folds every overlapping group into the first it meets, so the count
 * strictly falls and the rounds run out; in practice one settles it, and a set
 * with nothing to merge costs one indexed pass.
 *
 * @internal
 */
export function consolidate(groups: MapClusterSeed[], gap: number): MapClusterSeed[] {
	let held = groups

	let merging = true

	while (merging) {
		const next = mergeRound(held, gap)

		merging = next.length < held.length

		held = next
	}

	return held
}

/** One pass of {@link consolidate}: every group folded into the first mark it draws over. @internal */
function mergeRound(groups: MapClusterSeed[], gap: number): MapClusterSeed[] {
	const next: MapClusterSeed[] = []

	// Marks index-aligned with `next`, so a pair test reads two field loads
	// instead of re-deriving a mean and a grade for each side of it.
	const marks: (MapClusterMark | null)[] = []

	const cells = new Map<number, number[]>()

	// One cell per widest possible reach, so a mark this one could draw over can
	// only sit in the nine cells around it — the bound the broad phase runs on,
	// held here against the marks rather than the dots.
	const reach = MAX_CLUSTER_RADIUS * 2 + gap

	for (const group of groups) {
		const mark = markOf(group)

		const host = mark === null ? -1 : hostFor(cells, marks, mark, gap, reach)

		if (host === -1) {
			if (mark !== null) bucket(cells, cellOf(mark.at, reach)).push(next.length)

			next.push(group)

			marks.push(mark)

			continue
		}

		const merged = absorb(next[host] as MapClusterSeed, group)

		next[host] = merged

		const grown = markOf(merged)

		marks[host] = grown

		// The centre moved and the mark grew, so the slot may belong to another
		// cell now; index it there too. The entry left behind costs at most a
		// repeated test, never a missed pair, because every test reads the live
		// mark rather than the cell it was filed under.
		if (grown !== null) bucket(cells, cellOf(grown.at, reach)).push(host)
	}

	return next
}

/**
 * The slot of the first indexed mark this one draws within `gap` of, or `-1`
 * where it stands clear of every one of them.
 *
 * @internal
 */
function hostFor(
	cells: Map<number, number[]>,
	marks: readonly (MapClusterMark | null)[],
	mark: MapClusterMark,
	gap: number,
	reach: number,
): number {
	let host = -1

	walkNear(cells, mark.at, reach, (slot) => {
		const other = marks[slot]

		if (other == null || !marksOverlap(other, mark, gap)) return false

		host = slot

		return true
	})

	return host
}

/** A group's drawn mark, or `null` where the projection has no image for it. @internal */
function markOf(group: MapClusterSeed): MapClusterMark | null {
	const at = centre(group)

	return at === null ? null : { at, radius: clusterRadius(group.members.length) }
}

/**
 * Whether two marks draw closer than the clear space between their edges allows.
 * The one rule the output obeys — everything above it only decides how few pairs
 * have to be asked.
 *
 * @internal
 */
function marksOverlap(a: MapClusterMark, b: MapClusterMark, gap: number): boolean {
	const reach = a.radius + b.radius + gap

	return squared(a.at, b.at) < reach * reach
}
