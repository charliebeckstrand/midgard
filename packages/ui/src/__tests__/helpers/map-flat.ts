import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'

/**
 * Flat stand-ins for a projection, for the node suites of the map engine.
 *
 * Not re-exported from `helpers/index.ts`. The barrel loads user-event, which
 * needs a window, and the engine suites run with none. Each suite imports this
 * module by its path.
 */

/**
 * A projector of one frame unit for each degree, so that a reach reads straight
 * off the coordinates.
 *
 * @param position - The lon/lat position to project.
 * @returns The frame point, with x as the longitude and y as the latitude.
 */
export function flatProjector(position: LngLat): MapPoint2D {
	return { x: position[0], y: position[1] }
}

/**
 * An open square ring of `side` units, with its lower corner at `[shift, 0]`.
 *
 * @param shift - The distance of the square from the origin along x.
 * @returns The four corners, with no closing repeat.
 */
export function squareRing(side: number, shift = 0): LngLat[] {
	return [
		[shift, 0],
		[shift, side],
		[shift + side, side],
		[shift + side, 0],
	]
}

/** The count label as `MapDotCount` writes it with no `LocaleProvider`: English. */
const englishCount = new Intl.NumberFormat('en-US').format

/**
 * The radius a group of `count` dots draws at under the English label: what
 * `MapPoints` hands the merge pass with no `LocaleProvider`.
 *
 * @param count - How many dots the group holds.
 * @returns The radius, in device pixels.
 */
export function englishRadius(count: number): number {
	return clusterRadius(count, englishCount)
}
