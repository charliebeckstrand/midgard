/**
 * Which geography a territory is drawn against. A broker states coverage in ZIP
 * codes, and a code names no state on its own — so the states come from the
 * ground the codes cover, and the map draws those states split into their
 * counties.
 *
 * Each covered code is placed rather than the merged territory, and that is the
 * whole reason this pass reads `MapZipArea.features` instead of its polygons. A
 * territory along a state line is one shape whose centre sits in one state; its
 * codes sit in both, and a broker working that line covers both. Placing the
 * codes names both states, and placing the merged shape would name one.
 *
 * Most codes are placed without being measured at all. Every region whose box
 * meets a code's box is a region that code could sit in, and where all of them
 * agree on one state, no measurement can name another — so the code is settled
 * for the cost of two boxes. Only a code whose neighbourhood spans two states
 * reaches the exact placement below. Against the 2010 Illinois ZCTA file, 1,187
 * of 1,384 codes settle on the box alone.
 *
 * That is not only the faster path, it is the sounder one. The exact placement
 * reads a code's centroid, and a centroid is a point: it can land on water the
 * region atlas does not draw — Chicago's 60611 centres in Lake Michigan — and a
 * ring degenerate at the atlas's own precision has no centroid at all (61625
 * measures `NaN`). Both place correctly on their boxes, and both would otherwise
 * place nowhere.
 *
 * Where the boxes do disagree, the code is placed by its own centroid, so one
 * code belongs to one state. Real codes do cross state lines, and the centroid
 * decides which side such a code counts for.
 */

import { geoCentroid } from 'd3-geo'
import { rewindFeatures } from '../map-geometry/winding'
import type { LngLat, MapFeature, MapFeatureCollection } from '../types'
import { featureBounds, type MapRegionIndex, regionAt, regionsMeeting } from './locate'

/** How many leading characters of a county id name its state. @internal */
const STATE_FIPS_LENGTH = 2

/**
 * The default group a region belongs to: the first two characters of its id.
 * That is exactly the state FIPS code in every US county atlas, where a county
 * id is the five-digit `SSCCC` — `06037` is Los Angeles County in state `06`,
 * California. Any other atlas takes the `regionGroup` override.
 *
 * @internal
 */
export function defaultRegionGroup(feature: MapFeature): string {
	return String(feature.id ?? '').slice(0, STATE_FIPS_LENGTH)
}

/**
 * The groups a territory lands in — the states a set of covered codes covers.
 *
 * @param regions - The region features, in the order the index was built over.
 * @param index - The grid over those regions.
 * @param covered - The covered codes' own features.
 * @param regionGroup - How a region names its group.
 * @returns The groups, in the order the codes first reached them.
 *
 * @internal
 */
export function coverageGroups(
	regions: MapFeature[],
	index: MapRegionIndex,
	covered: MapFeature[],
	regionGroup: (feature: MapFeature) => string,
): Set<string> {
	const groups = new Set<string>()

	for (const shape of covered) {
		const forced = forcedGroup(regions, index, shape, regionGroup)

		if (forced !== null) {
			groups.add(forced)

			continue
		}

		// The area centroid, which is what places a code against the ground it
		// covers. A code shaped around another one can centre outside its own ring,
		// and it still lands in the right state, which is all this asks.
		//
		// Wound here, on this one code, rather than over the whole territory up
		// front: d3 reads a backwards ring as everything outside it, so the
		// measurement needs the winding — and only the codes that reach this line
		// are measured at all.
		const [wound = shape] = rewindFeatures([shape])

		const at = geoCentroid(wound as Parameters<typeof geoCentroid>[0]) as LngLat

		if (!Number.isFinite(at[0]) || !Number.isFinite(at[1])) continue

		const region = regionAt(index, regions, at)

		if (region === -1) continue

		const holder = regions[region]

		if (holder !== undefined) groups.add(regionGroup(holder))
	}

	return groups
}

/**
 * The one group a code can possibly belong to, or `null` where more than one is
 * still open. The exact placement below runs only for the `null` answers.
 *
 * A code sits on ground some region covers, and every region whose box meets the
 * code's box is named here — so where all of those agree on a group, the code is
 * in that group and no measurement can say otherwise. This never names a group a
 * measurement would refuse; where the two differ, it is because the measurement
 * named nothing at all (see the note at the top of this file), and this named the
 * one group that was open.
 *
 * It is worth the check because the exact placement reads a spherical centroid
 * over every vertex of a code's rings, which is the most expensive thing in the
 * pass by an order of magnitude — and because a code near no border, which is
 * most of them, is decided here for the cost of a box. It also answers for the
 * two kinds of code a centroid cannot place at all: one that centres on water
 * outside every region, and one whose rings are degenerate enough to have no
 * centroid.
 *
 * @internal
 */
function forcedGroup(
	regions: MapFeature[],
	index: MapRegionIndex,
	shape: MapFeature,
	regionGroup: (feature: MapFeature) => string,
): string | null {
	const box = featureBounds(shape)

	if (box === null) return null

	let only: string | null = null

	for (const region of regionsMeeting(index, box)) {
		const holder = regions[region]

		if (holder === undefined) continue

		const group = regionGroup(holder)

		if (only === null) only = group
		else if (only !== group) return null
	}

	return only
}

/**
 * The regions belonging to a set of groups, as the geography a `MapPlat` frames
 * itself to. The plat fits every geography it is handed, so handing it one
 * state's counties draws that state split into them — the drill-down the module
 * already frames a picked region with, and no new projection rule.
 *
 * @param regions - Every region in the atlas.
 * @param groups - The groups to keep.
 * @param regionGroup - How a region names its group.
 * @returns The kept regions, or `null` where no group was named — a territory
 * that placed nowhere frames nothing, and the caller draws the whole atlas or
 * an empty map as it prefers.
 *
 * @internal
 */
export function groupFrame(
	regions: MapFeature[],
	groups: Set<string>,
	regionGroup: (feature: MapFeature) => string,
): MapFeatureCollection | null {
	if (groups.size === 0) return null

	const features = regions.filter((region) => groups.has(regionGroup(region)))

	return features.length === 0 ? null : { type: 'FeatureCollection', features }
}
