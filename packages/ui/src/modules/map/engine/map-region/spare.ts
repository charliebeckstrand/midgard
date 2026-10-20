/**
 * What the region under a dot can spare it: the region part of the hit-target
 * rule. `map-cluster/crowd.ts` holds the neighbor part and the list of
 * claimants, `map-geofence.ts` the zone part, and `markTargets` joins them.
 *
 * The zone half learned the rule first. A figure that suits one shape blankets
 * a smaller one. A zone therefore publishes its own inscribed room, and a dot
 * takes a share of it ({@link AREA_SPARE_FRACTION}). Regions are the same
 * question asked of shapes three orders of magnitude apart in area. That is why
 * the one figure this replaced could only be safe at the small end. It was the
 * dot's own paint, held against every region on every map. A state with room to
 * spare therefore took the same bite as one with none. A dot over open water
 * paid as much as either.
 *
 * The claim used to be resolved map-wide because no dot could ask what region it
 * stood on. The module resolves a region off a pointed DOM element, not off a
 * coordinate. It can ask now. `map-geometry/locate.ts` already indexes an atlas
 * by bounding box for the coverage frame, and the fit inverts. A frame position
 * therefore becomes a lon/lat, and the grid takes the candidates down to a
 * handful.
 *
 * Frame arithmetic with no React in it, like its two siblings.
 */

import { AREA_SPARE_FRACTION, POINT_HIT_RADIUS, POINT_RADIUS } from '../map-constants'
import { cachedRegionIndex, type MapBounds, regionsMeeting } from '../map-geometry/locate'
import {
	areaReach,
	featureRings,
	isNearBox,
	isNearRings,
	type MapAreaBox,
	type MapFrameBox,
	projectArea,
} from '../map-geometry/mark'
import type { LngLat, MapFeature, MapPoint2D } from '../types'

/**
 * How much reach the region layer leaves a dot at a frame position, in device
 * pixels. It is `Infinity` where it claims nothing, which is the identity of
 * the minimum `markTargets` folds every claimant into.
 *
 * @internal
 */
export type MapRegionSpare = (at: MapPoint2D, unitsPerPixel: number) => number

/**
 * The resolver for a layer that answers nothing. Exported so the plat can state
 * that case itself. Whether the regions answer the pointer is its own policy,
 * and a geometry leaf must not take a boolean about a component's props.
 *
 * @internal
 */
export const NO_REGION_CLAIM: MapRegionSpare = () => Number.POSITIVE_INFINITY

/**
 * A region measured once per fit: the whole region's box, the boxes of the rings
 * inside it, and the room they hold.
 *
 * The outer box is the reject the ring walk needs in front of it. `isNearRings`
 * returns on its first hit and walks every ring on a miss. A miss is the common
 * case for a candidate the geographic grid admitted. A dot that admits
 * Alaska therefore pays 137 box tests to learn it stands in Florida. One test
 * settles it, and the box is free while the rings are being measured.
 *
 * @internal
 */
type MeasuredRegion = { whole: MapFrameBox | null; boxes: MapAreaBox[]; reach: number }

/**
 * The halvings that place an inset edge on a ray from the dot. Sixteen place it
 * to within 1/65,536 of the reach, far below a pixel at any zoom.
 *
 * @internal
 */
const EDGE_STEPS = 16

/**
 * The step that reads the local slope of the inverse, as a fraction of the
 * reach. It is small, so that a dot stands farther than this from its inset's
 * edge on at least one side.
 *
 * @internal
 */
const SLOPE_STEP = 1e-6

/**
 * Degrees of lon/lat for each frame unit along one frame axis, at the dot.
 *
 * @internal
 */
type MapSlope = { x: LngLat; y: LngLat }

/**
 * A longitude difference in the range -180 to 180. Thus the antimeridian does
 * not read as a jump, and the box across it stays as it was.
 *
 * @internal
 */
function lonStep(difference: number): number {
	return difference - 360 * Math.round(difference / 360)
}

/**
 * The slope of the inverse along one frame axis, read on the two sides of the
 * dot. A side that crosses an inset edge reads a jump, which is a much steeper
 * slope, so the gentler side wins. `[0, 0]` where neither side inverts, which
 * clamps that axis to the dot itself.
 *
 * @internal
 */
function slopeAlong(
	unproject: (at: MapPoint2D) => LngLat | null,
	at: MapPoint2D,
	origin: LngLat,
	axis: MapPoint2D,
	step: number,
): LngLat {
	let gentlest: LngLat = [0, 0]

	let found = false

	for (const side of [1, -1]) {
		const seen = unproject({ x: at.x + side * axis.x * step, y: at.y + side * axis.y * step })

		if (seen === null) continue

		const slope: LngLat = [
			(side * lonStep(seen[0] - origin[0])) / step,
			(side * (seen[1] - origin[1])) / step,
		]

		if (!found || Math.hypot(...slope) < Math.hypot(...gentlest)) gentlest = slope

		found = true
	}

	return gentlest
}

/**
 * The lon/lat at an offset from the dot, or `null` where the offset leaves the
 * piece of the projection that inverts the dot.
 *
 * The test is the slope: inside one piece the inverse is smooth, so the lon/lat
 * stays near the slope's prediction. A composite sends a position past an inset
 * edge through another piece, and the lon/lat jumps by many degrees. `d3-geo`'s
 * `geoAlbersUsa` inverts every position, and so the jump is the only sign of it.
 *
 * @internal
 */
function pieceInverse(
	unproject: (at: MapPoint2D) => LngLat | null,
	at: MapPoint2D,
	origin: LngLat,
	slope: MapSlope,
	offset: MapPoint2D,
): LngLat | null {
	const seen = unproject({ x: at.x + offset.x, y: at.y + offset.y })

	if (seen === null) return null

	const lon = offset.x * slope.x[0] + offset.y * slope.y[0]

	const lat = offset.x * slope.x[1] + offset.y * slope.y[1]

	const miss = Math.hypot(lonStep(seen[0] - origin[0]) - lon, seen[1] - origin[1] - lat)

	return miss <= Math.hypot(lon, lat) / 2 ? seen : null
}

/**
 * The fraction of an offset that stays in the dot's own piece, by halving.
 *
 * @internal
 */
function pieceFraction(
	unproject: (at: MapPoint2D) => LngLat | null,
	at: MapPoint2D,
	origin: LngLat,
	slope: MapSlope,
	offset: MapPoint2D,
): number {
	if (pieceInverse(unproject, at, origin, slope, offset) !== null) return 1

	let inside = 0

	let outside = 1

	for (let step = 0; step < EDGE_STEPS; step += 1) {
		const middle = (inside + outside) / 2

		const scaled = { x: offset.x * middle, y: offset.y * middle }

		if (pieceInverse(unproject, at, origin, slope, scaled) === null) outside = middle
		else inside = middle
	}

	return inside
}

/**
 * The lon/lat of one corner of the reach box, with the corner clamped to the
 * dot's own inset box before it inverts.
 *
 * Each axis clamps alone, so a dot near one edge keeps its full reach along the
 * other. The diagonal clamps last, for a piece whose region is not a box: the
 * lower-48 conic holds the frame around the insets.
 *
 * @internal
 */
function pieceCorner(
	unproject: (at: MapPoint2D) => LngLat | null,
	at: MapPoint2D,
	origin: LngLat,
	slope: MapSlope,
	corner: MapPoint2D,
): LngLat {
	const whole = pieceInverse(unproject, at, origin, slope, corner)

	if (whole !== null) return whole

	const x = corner.x * pieceFraction(unproject, at, origin, slope, { x: corner.x, y: 0 })

	const y = corner.y * pieceFraction(unproject, at, origin, slope, { x: 0, y: corner.y })

	const fraction = pieceFraction(unproject, at, origin, slope, { x, y })

	const clamped = { x: x * fraction, y: y * fraction }

	return pieceInverse(unproject, at, origin, slope, clamped) ?? origin
}

/**
 * The lon/lat box a dot's widest possible target covers, from the frame box
 * around it. Both corners invert rather than the center alone, because the
 * conversion from pixels to degrees is the projection's own and varies with
 * latitude. An inset composite changes it outright.
 *
 * Each corner clamps to the dot's own inset box before it inverts. A corner past
 * an inset edge otherwise inverts through another piece of the composite, and
 * the box lies to one side of the dot and can miss the region it stands on.
 *
 * `null` where the dot itself does not invert, which reads as no claim. The
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
	const origin = unproject(at)

	if (origin === null) return null

	const step = reach * SLOPE_STEP

	const slope = {
		x: slopeAlong(unproject, at, origin, { x: 1, y: 0 }, step),
		y: slopeAlong(unproject, at, origin, { x: 0, y: 1 }, step),
	}

	const [west, south] = pieceCorner(unproject, at, origin, slope, { x: -reach, y: reach })

	const [east, north] = pieceCorner(unproject, at, origin, slope, { x: reach, y: -reach })

	// The inverted corners are not ordered where a projection turns the frame
	// (the composite's insets sit at their own rotations), so the box takes the
	// extremes rather than the corners as read.
	return {
		west: Math.min(west, east),
		south: Math.min(south, north),
		east: Math.max(west, east),
		north: Math.max(south, north),
	}
}

/**
 * The one box holding every ring's, or `null` for a region that projected
 * nothing. Such a region then rejects every dot, the right answer for a shape
 * that draws nothing to claim with.
 *
 * @internal
 */
function wholeBox(boxes: readonly MapAreaBox[]): MapFrameBox | null {
	const first = boxes[0]

	if (first === undefined) return null

	const whole = { ...first.box }

	for (const { box } of boxes) {
		whole.left = Math.min(whole.left, box.left)

		whole.top = Math.min(whole.top, box.top)

		whole.right = Math.max(whole.right, box.right)

		whole.bottom = Math.max(whole.bottom, box.bottom)
	}

	return whole
}

/**
 * Whether a measured region draws within `reach` of a position.
 *
 * The whole-region box answers first and answers most. The grid admits a
 * candidate on a lon/lat box, which for an antimeridian-crossing region reads
 * as spanning every longitude. Such a region is therefore offered to every dot
 * on the map, and one comparison sends it away. The ring walk behind it says
 * more only where there are several rings to tell apart, as in an archipelago
 * or a state with islands. For a single-ring region it would re-ask what the
 * whole box has already settled.
 *
 * @internal
 */
function isNearRegion(region: MeasuredRegion, at: MapPoint2D, reach: number): boolean {
	if (region.whole === null || !isNearBox(region.whole, at, reach)) return false

	return region.boxes.length < 2 || isNearRings(region.boxes, at, reach)
}

/**
 * Resolves how much room the region layer leaves each dot, over one geography
 * under one fit.
 *
 * A dot answers to every region its target could cover rather than to the one it
 * stands in. That is the zone half's own reading, where a dot overlapping two
 * zones satisfies both. It is what keeps a dot just inside a large state from
 * blanketing the small one across the border.
 *
 * Containment is never tested. `isNearRings` asks whether a region draws within
 * the dot's reach, which is the question the claim actually turns on. A dot
 * outside a region but near enough to cover part of it takes that region's
 * ground as surely as one standing in the middle. The grid's own answer is a
 * box test, and so names regions the dot cannot reach. `isNearRings` is the
 * tighter filter behind it that makes the over-approximation harmless, and it
 * reads the projected boxes rather than the geographic ones.
 *
 * The two projectors travel together because both leave one memo in
 * `useMapShape`. A pair from different fits would measure rings in one frame
 * and place dots in another.
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
	// Per region, the boxes to place a dot against and the room it holds: built
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

		const feature = features[region]

		const rings = feature === undefined ? [] : projectArea(featureRings(feature), project)

		const boxes = rings.map(({ box }) => ({ box }))

		const built = { whole: wholeBox(boxes), boxes, reach: areaReach(rings) }

		measured.set(region, built)

		return built
	}

	// Held across calls and cleared per call rather than allocated per call: the
	// grid yields a region once per cell its box covers, so a large state arrives
	// twenty times for one dot, and each repeat would otherwise pay a full
	// `isNearRings` walk of every ring it holds. The resolver is not reentrant.
	const seen = new Set<number>()

	return (at, unitsPerPixel) => {
		// The widest target any pointer takes, in frame units: the band inside which
		// a region is worth asking about at all.
		const reach = POINT_HIT_RADIUS * unitsPerPixel

		const box = reachBounds(unproject, at, reach)

		if (box === null) return Number.POSITIVE_INFINITY

		seen.clear()

		let room = Number.POSITIVE_INFINITY

		// The atlas index is read here rather than at build time, so a map that draws
		// no dot-shaped mark never builds one: indexing walks every coordinate in the
		// atlas, which on a county one is the same order of work as drawing it. It
		// memoizes on the feature list itself, so the lookup is all this costs.
		for (const region of regionsMeeting(cachedRegionIndex(features), box)) {
			if (seen.has(region)) continue

			seen.add(region)

			const held = measure(region)

			if (!isNearRegion(held, at, reach)) continue

			room = Math.min(room, (held.reach / unitsPerPixel) * AREA_SPARE_FRACTION)

			// `markTargets` floors every claim at what the dot paints, so once the
			// tightest region has driven the budget there, no further candidate can
			// move it. This is what the grid's generator is for: the ZIP frame stops
			// on its first disagreement for the same reason.
			if (room <= POINT_RADIUS) break
		}

		return room
	}
}
