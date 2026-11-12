/**
 * Pure clustering math for the map module: which dots fall close enough on the
 * frame to draw as one summary, and where that summary sits. React-free like
 * the rest of the engine, so the grouping is unit-testable without a frame.
 * Three neighbors carry the parts this one does not:
 *
 * - `tree.ts`: the merges of the dots over the scale, which the pass cuts.
 * - `radius.ts`: the size a summary draws at, which the caller hands in.
 * - `geo.ts`: what a group reads out on the ground.
 */

import { POINT_CLUSTER_GAP } from '../map-constants'
import type { LngLat, MapProjector } from '../types'
import type { MapClusterRadius } from './radius'
import { clusterTree, cutTree, type MapPointCluster } from './tree'

/**
 * The edge-to-edge gap a `cluster` prop asks for, in device pixels; `null` where
 * it is off. The one reading of the public prop, held beside the pass it feeds
 * so the contract is testable without rendering a mark.
 *
 * @internal
 */
export function clusterGap(cluster: boolean | number): number | null {
	if (cluster === true) return POINT_CLUSTER_GAP

	return cluster === false ? null : Math.max(0, cluster)
}

/**
 * Which group holds each of the caller's dots, by the index the mark reports.
 * That is the resolution a pick needs. A click names a point the caller passed,
 * while the mark draws the groups those points merged into.
 *
 * Built as a whole rather than searched per lookup. A pick is read on every
 * render of the mark it names, and every hover crossing on the map re-renders
 * every mark. A scan per read would therefore walk the set hundreds of times
 * over one pointer sweep. This walks it once per regrouping.
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

/**
 * The gap of each dot, and the widest of them, as `gap` gives them.
 *
 * @internal
 */
export function clusterGaps(gap: number | readonly number[]): {
	getGap: (index: number) => number
	widestGap: number
} {
	if (typeof gap === 'number') return { getGap: () => gap, widestGap: gap }

	return {
		getGap: (index: number) => gap[index] ?? 0,
		widestGap: gap.reduce((most, each) => Math.max(most, each), 0),
	}
}

/**
 * Groups the dots a frame draws too close together to tell apart.
 *
 * `gap` is the clear space two marks keep between their edges, in device
 * pixels. Measured edge to edge, so the one number holds however wide a mark
 * grows.
 *
 * `unitsPerPixel` is what one device pixel spans in frame units: `1` at rest,
 * and `1 / k` under the zoom layer's transform. That transform scales the drawn
 * frame without refitting the projection. The gap and the marks' own radii are
 * both pixel measures, as every mark spec in the module is. The rule measures
 * the distance in frame units over the reach in pixels, so a zoom that spreads
 * the dots apart on screen separates them at once.
 *
 * `getRadius` is how wide a group of each count draws, in device pixels: the
 * drawn mark's own `clusterRadius`, bound to the count label it holds. The rule
 * measures each mark at the size it draws. Thus a summary that grows to hold a
 * wide count also takes the room it grows into.
 *
 * Grouping runs on the projected frame rather than on lon/lat, because overlap
 * is a property of the drawn picture. The same round summarizes in a small
 * frame and separates in a large one, without its coordinates changing.
 *
 * `gap` can also be a list, one gap for each dot. The dots of several sets then
 * group in one pass, and each set keeps the clear space it asks for. A pair of
 * marks keeps the larger of their two gaps, and a group asks for the largest gap
 * of its members. One number for every dot gives the same result as a list that
 * holds that number for each dot.
 *
 * Every point reaches exactly one group, in the caller's own order. A `gap` of
 * `null` turns the grouping off. It returns the points one per group, unchanged
 * and index for index. The caller asked for every dot, and no pass can take one
 * away. A dot the projection drops holds its own group too, so it keeps its
 * readout row where the map draws nothing for it.
 *
 * The groups are the cut of {@link clusterTree} at `unitsPerPixel`, so they are
 * the groups that every narrower frame refines.
 *
 * @internal
 */
export function clusterPoints(
	positions: readonly LngLat[],
	project: MapProjector,
	gap: number | readonly number[] | null,
	getRadius: MapClusterRadius,
	unitsPerPixel = 1,
): MapPointCluster[] {
	if (gap === null) {
		return positions.map((position, index) => ({ members: [index], at: project(position) }))
	}

	const { getGap, widestGap } = clusterGaps(gap)

	return cutTree(
		clusterTree(positions, project, getGap, widestGap, getRadius, unitsPerPixel),
		unitsPerPixel,
	)
}
