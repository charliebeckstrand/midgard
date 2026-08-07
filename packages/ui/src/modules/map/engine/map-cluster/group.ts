/**
 * The clustering entry point: which dots fall close enough on the frame to draw
 * as one summary, and where that summary sits. React-free like the rest of the
 * engine, so the grouping is unit-testable without a frame.
 *
 * The two passes behind it are `seed.ts` (the broad phase) and `merge.ts` (the
 * overlap rule they both settle to); the spatial index they bucket into is
 * `grid.ts`, and what a group reads out on the ground is `geo.ts`.
 */

import { POINT_RADIUS } from '../map-constants'
import type { LngLat, MapPoint2D } from '../types'
import { consolidate } from './merge'
import { centre, type MapClusterSeed, seedGroups } from './seed'

/**
 * One drawn group: the dots it stands for, and where it draws. A group of one is
 * an ordinary dot, so a mark draws its summaries and its single dots through one
 * path.
 *
 * It carries frame arithmetic alone. What a group reads out — its anchor and its
 * spread — is spherical, costs a `d3-geo` pass per group, and is wanted by one
 * caller each, so `geo.ts` resolves it where it is read rather than on every
 * pass.
 *
 * @internal
 */
export type MapPointCluster = {
	/** The group's dots, as indices into the caller's own points, ascending. */
	members: number[]
	/**
	 * Where the group draws, in frame units: the mean of its members' projected
	 * positions. `null` where the projection has no image for the dots — the US
	 * composite drops points outside its insets — so the group draws nothing and
	 * keeps its readout.
	 */
	at: MapPoint2D | null
}

/**
 * Groups the dots a frame draws too close together to tell apart.
 *
 * `gap` is the clear space two marks keep between their edges. Measured edge to
 * edge, so the one number holds however wide a mark grows: it decides the broad
 * phase's dot-to-dot reach and the overlap rule alike, and a future viewBox zoom
 * scales the whole reach by one factor rather than each term by its own.
 *
 * Grouping runs on the projected frame rather than on lon/lat, because overlap
 * is a property of the drawn picture: the same round summarises in a small frame
 * and separates in a large one without its coordinates changing.
 *
 * Every point reaches exactly one group, in the caller's own order. A `gap` of
 * `null` turns the grouping off and returns the points one per group, unchanged
 * and index for index — the caller asked for every dot, and no pass may take one
 * away. A dot the projection drops holds its own group too, so it keeps its
 * readout row where the map draws nothing for it.
 *
 * @internal
 */
export function clusterPoints(
	positions: readonly LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
	gap: number | null,
): MapPointCluster[] {
	if (gap === null) {
		return positions.map((position, index) => ({ members: [index], at: project(position) }))
	}

	return consolidate(seedGroups(positions, project, POINT_RADIUS * 2 + gap), gap).map(summarise)
}

/**
 * Which group holds each of the caller's dots, by the index the mark reports —
 * the resolution a pick needs, since a click names a point the caller passed
 * while the mark draws the groups those points merged into.
 *
 * Built as a whole rather than searched per lookup: a pick is read on every
 * render of the mark it names, and every hover crossing on the map re-renders
 * every mark — so a scan per read would walk the set hundreds of times over one
 * pointer sweep, where this walks it once per regrouping.
 *
 * @internal
 */
export function groupsByMember(groups: readonly MapPointCluster[]): ReadonlyMap<number, number> {
	const held = new Map<number, number>()

	for (const [index, group] of groups.entries()) {
		for (const member of group.members) held.set(member, index)
	}

	return held
}

/** Resolves a built group to the dots it holds and the point it draws at. @internal */
function summarise(group: MapClusterSeed): MapPointCluster {
	return { members: group.members, at: centre(group) }
}
