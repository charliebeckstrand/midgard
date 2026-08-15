/**
 * What the region under a dot can spare it — the region half of the hit-target
 * rule, whose zone half is `map-geofence.ts` and whose join is `markTargets`.
 *
 * The zone half learned the rule first: a figure that suits one shape blankets a
 * smaller one, so a zone publishes its own inscribed room and a dot takes a share
 * of it ({@link AREA_SPARE_FRACTION}). Regions are the same question asked of
 * shapes three orders of magnitude apart in area, which is why the one figure
 * this replaced could only be safe at the small end: the dot's own paint, held
 * against every region on every map, so a state with room to spare took the same
 * bite as one with none and a dot over open water paid as much as either.
 *
 * The claim used to be resolved map-wide because no dot could ask what region it
 * stood on: the module resolves a region off a pointed DOM element, not off a
 * coordinate. It can ask now. `map-geometry/locate.ts` already indexes an atlas by
 * bounding box for the coverage frame, and the fit inverts, so a frame position
 * becomes a lon/lat and the grid takes the candidates down to a handful.
 *
 * Frame arithmetic with no React in it, like both of its siblings.
 */

import { once } from '../../../../utilities'
import { AREA_SPARE_FRACTION, POINT_HIT_RADIUS, POINT_RADIUS } from '../map-constants'
import { cachedRegionIndex, type MapBounds, regionsMeeting } from '../map-geometry/locate'
import {
	areaReach,
	featureRings,
	type MapAreaBox,
	projectArea,
	ringsNear,
} from '../map-geometry/mark'
import type { LngLat, MapFeature, MapPoint2D } from '../types'

/**
 * How much reach the region layer leaves a dot at a frame position, in device
 * pixels — `Infinity` where it claims nothing, which is the identity of the
 * minimum `markTargets` folds every claimant into.
 *
 * @internal
 */
export type MapRegionSpare = (at: MapPoint2D, unitsPerPixel: number) => number

/**
 * The resolver for a layer that answers nothing. Exported so the plat can state
 * that case itself: whether the regions answer the pointer is its own policy, and
 * a geometry leaf should not take a boolean about a component's props.
 *
 * @internal
 */
export const NO_REGION_CLAIM: MapRegionSpare = () => Number.POSITIVE_INFINITY

/** A region measured once per fit: the boxes to place a dot against, and the room it holds. @internal */
type MeasuredRegion = { boxes: MapAreaBox[]; reach: number }

/**
 * The lon/lat box a dot's widest possible target covers, from the frame box
 * around it. Both corners invert rather than the centre alone, because the
 * conversion from pixels to degrees is the projection's own and varies with
 * latitude — and an inset composite changes it outright.
 *
 * `null` where either corner does not invert, which reads as no claim. The
 * alternative is a box grown to the whole sphere, and a dot the projection has
 * already dropped is not standing on a region. Returning early also keeps a
 * dropped dot from building the atlas index behind it.
 *
 * @internal
 */
function reachBounds(
	unproject: (at: MapPoint2D) => LngLat | null,
	at: MapPoint2D,
	reach: number,
): MapBounds | null {
	const low = unproject({ x: at.x - reach, y: at.y + reach })

	const high = unproject({ x: at.x + reach, y: at.y - reach })

	if (low === null || high === null) return null

	const [west, south] = low

	const [east, north] = high

	// The inverted corners are not ordered where a projection turns the frame —
	// the composite's insets sit at their own rotations — so the box takes the
	// extremes rather than the corners as read.
	return {
		west: Math.min(west, east),
		south: Math.min(south, north),
		east: Math.max(west, east),
		north: Math.max(south, north),
	}
}

/**
 * Resolves how much room the region layer leaves each dot, over one geography
 * under one fit.
 *
 * A dot answers to every region its target could cover rather than to the one it
 * stands in. That is the zone half's own reading — a dot overlapping two zones
 * satisfies both — and it is what keeps a dot just inside a large state from
 * blanketing the small one across the border.
 *
 * Containment is never tested. `ringsNear` asks whether a region draws within the
 * dot's reach, which is the question the claim actually turns on: a dot outside a
 * region but near enough to cover part of it takes that region's ground as surely
 * as one standing in the middle. The grid's own answer is a box test and so names
 * regions the dot cannot reach; `ringsNear` is the tighter filter behind it that
 * makes the over-approximation harmless, and it reads the projected boxes rather
 * than the geographic ones.
 *
 * The two projectors travel together because both leave one memo in
 * `useMapShape` — a pair from different fits would measure rings in one frame and
 * place dots in another.
 *
 * @param features - The decoded regions, as the layer draws them.
 * @param unproject - Frame position back to lon/lat, for asking the grid.
 * @param project - Lon/lat to frame position, for measuring a region's rings.
 * @returns The per-dot resolver. {@link NO_REGION_CLAIM} where the layer answers
 * nothing, which is the caller's call and not this one's.
 *
 * @internal
 */
export function regionSpare(
	features: MapFeature[],
	unproject: (at: MapPoint2D) => LngLat | null,
	project: (position: LngLat) => MapPoint2D | null,
): MapRegionSpare {
	// Read on the first dot that asks rather than here, so a map that draws no
	// dot-shaped mark never builds one. Indexing walks every coordinate in the
	// atlas, which on a county one is the same order of work as drawing it — a
	// plain choropleth must not pay that to answer a question nothing asks.
	const index = once(() => cachedRegionIndex(features))

	// Per region, the boxes to place a dot against and the room it holds — built
	// on the first dot whose reach box meets the region's own, which is a wider
	// set than the regions dots actually stand on and still a small one.
	//
	// The vertices go to garbage as soon as the measure is taken: `areaReach`
	// walks them once, and every reader after it wants the boxes alone. An atlas
	// region runs to thousands of points, and a handful of them held for the life
	// of a fit is megabytes retained to read four numbers per ring.
	const measured = new Map<number, MeasuredRegion>()

	const measure = (region: number): MeasuredRegion => {
		const hit = measured.get(region)

		if (hit !== undefined) return hit

		const shape = features[region]

		const rings = shape === undefined ? [] : projectArea(featureRings(shape), project)

		const built = { boxes: rings.map(({ box }) => ({ box })), reach: areaReach(rings) }

		measured.set(region, built)

		return built
	}

	// Held across calls and cleared per call rather than allocated per call: the
	// grid yields a region once per cell its box covers, so a large state arrives
	// twenty times for one dot, and each repeat would otherwise pay a full
	// `ringsNear` walk of every ring it holds. The resolver is not reentrant.
	const seen = new Set<number>()

	return (at, unitsPerPixel) => {
		// The widest target any pointer takes, in frame units: the band inside which
		// a region is worth asking about at all.
		const reach = POINT_HIT_RADIUS * unitsPerPixel

		const box = reachBounds(unproject, at, reach)

		if (box === null) return Number.POSITIVE_INFINITY

		seen.clear()

		let room = Number.POSITIVE_INFINITY

		for (const region of regionsMeeting(index(), box)) {
			if (seen.has(region)) continue

			seen.add(region)

			const { boxes, reach: held } = measure(region)

			if (!ringsNear(boxes, at, reach)) continue

			room = Math.min(room, (held / unitsPerPixel) * AREA_SPARE_FRACTION)

			// `markTargets` floors every claim at what the dot paints, so once the
			// tightest region has driven the budget there, no further candidate can
			// move it. This is what the grid's generator is for — the ZIP frame stops
			// on its first disagreement for the same reason.
			if (room <= POINT_RADIUS) break
		}

		return room
	}
}
