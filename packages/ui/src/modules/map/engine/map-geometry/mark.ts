/**
 * What the overlay marks draw: one lon/lat projected to the frame, and the path
 * strings a dot, a polyline, and a closed ring paint from it. Held apart from
 * `region.ts` because the marks project point by point through a closure the
 * plat hands down, where the region layer projects whole features through
 * `d3-geo`'s own path generator.
 *
 * That point-by-point walk is what bounds the ring: it draws each edge straight
 * in the frame, where `geoPath` would resample the edge along the sphere and
 * clip it at the antimeridian. A geofence over a metro or a state reads the same
 * either way, and one that wraps the world does not — so the marks keep the
 * cheap walk and the region layer keeps the exact one.
 */

import { type GeoProjection, geoCentroid } from 'd3-geo'
import type { LngLat, MapPoint2D } from '../types'

/**
 * Projects one lon/lat to frame coordinates, or `null` where the projection
 * has no image for it — the US composite drops points outside its insets.
 *
 * @internal
 */
export function projectPoint(projection: GeoProjection, position: LngLat): MapPoint2D | null {
	const projected = projection(position)

	return projected === null ? null : { x: projected[0], y: projected[1] }
}

/**
 * The frame points a run of lon/lat projects to, with the ones the projector
 * drops left out. The shared half of every path below, so an open line and a
 * closed ring can never disagree about which points survive.
 *
 * @internal
 */
function projectRun(
	points: LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
): MapPoint2D[] {
	return points.flatMap((point) => {
		const at = project(point)

		return at ? [at] : []
	})
}

/** The `M…L…` command run through projected frame points. @internal */
function polylineCommands(points: MapPoint2D[]): string {
	return points
		.map((at, index) => `${index === 0 ? 'M' : 'L'}${round(at.x)},${round(at.y)}`)
		.join('')
}

/**
 * A polyline's SVG path through the projected points, skipping any the
 * projector drops; empty when fewer than two survive. Takes the projector as
 * a closure — the shape {@link MapPlat} provides its overlays through
 * context.
 *
 * @internal
 */
export function linePath(
	points: LngLat[],
	project: (position: LngLat) => MapPoint2D | null,
): string {
	const projected = projectRun(points, project)

	if (projected.length < 2) return ''

	return polylineCommands(projected)
}

/**
 * A closed ring's SVG path through the projected points, skipping any the
 * projector drops; empty when fewer than three survive, which is the fewest an
 * area can hold. {@link linePath} with a `Z`, so a geofence's fill, its
 * boundary, its hit stroke, and its halo all trace one string and can never
 * diverge.
 *
 * The ring a caller hands in repeats its first position at the end, as a GeoJSON
 * ring does. The `Z` closes the path either way, so the repeat costs one
 * zero-length segment and never a gap.
 *
 * @internal
 */
export function ringPath(ring: LngLat[], project: (position: LngLat) => MapPoint2D | null): string {
	const projected = projectRun(ring, project)

	if (projected.length < 3) return ''

	return `${polylineCommands(projected)}Z`
}

/**
 * The geographic middle of a line of points, as the stop list a line-shaped mark
 * registers: the cursor lands on the mark rather than at one end, where several
 * routes out of one depot would stack on the shared origin. A list, and empty
 * where the line has no points, so a caller passes the result straight through.
 *
 * An odd count takes its middle point; an even one takes the midpoint of the two
 * middle points, so the common two-point line (a `MapMarker` with no routed
 * path, a two-stop `MapRoute`) anchors between its ends rather than on one of
 * them. Interpolated in lon/lat rather than on the projected plane: the anchor
 * only has to sit on the mark, and this way it needs no projection to compute
 * and survives every refit.
 *
 * @internal
 */
export function lineAnchor(points: LngLat[]): LngLat[] {
	const half = points.length / 2

	if (points.length === 0) return []

	if (points.length % 2 === 1) {
		const middle = points[Math.floor(half)]

		return middle === undefined ? [] : [middle]
	}

	const before = points[half - 1]

	const after = points[half]

	if (before === undefined || after === undefined) return []

	return [[(before[0] + after[0]) / 2, (before[1] + after[1]) / 2]]
}

/**
 * How near two positions must be, in degrees, to count as the same point — about
 * a tenth of a millimetre on the ground. A ring's closing repeat is the literal
 * first position where a caller wrote it out, and one rounding step away where a
 * generator traced it, so the test that finds it must hold for both.
 *
 * @internal
 */
const SAME_POSITION_EPSILON = 1e-9

/**
 * The middle of a closed ring, as the stop list an area-shaped mark registers:
 * the cursor stands in the zone rather than on one corner of it. A list, and
 * empty where the ring has no points, so a caller passes the result straight
 * through — {@link lineAnchor}'s contract for the shape that encloses.
 *
 * The centre is the spherical centroid of the ring's own vertices, not of the
 * area they enclose: it needs no winding to be right, where a `Polygon` centroid
 * reads a backwards ring as the whole world outside it and centres on the far
 * side of the earth. A geofence stands where its outline stands, so the vertices
 * answer the question the cursor asks.
 *
 * The closing repeat is dropped first, or it would weight that one side twice.
 * Vertices that cancel — a ring about a pole — leave no centre, and the first
 * vertex stands in, which is a position the projection can draw.
 *
 * @internal
 */
export function ringAnchor(ring: LngLat[]): LngLat[] {
	const first = ring[0]

	if (first === undefined) return []

	const last = ring[ring.length - 1]

	const closed =
		last !== undefined &&
		ring.length > 1 &&
		Math.abs(last[0] - first[0]) < SAME_POSITION_EPSILON &&
		Math.abs(last[1] - first[1]) < SAME_POSITION_EPSILON

	const coordinates = closed ? ring.slice(0, -1) : ring

	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates } as unknown as Parameters<
		typeof geoCentroid
	>[0])

	return Number.isFinite(lon) && Number.isFinite(lat) ? [[lon, lat]] : [first]
}

/**
 * A dot's SVG path: a zero-length segment whose round cap paints the circle.
 * Drawn as a stroke — not a `<circle>` — because only stroke width can ride
 * device pixels (`vector-effect="non-scaling-stroke"`); a radius scales with
 * the viewBox, so a resize whose refit lands late would balloon it.
 *
 * @internal
 */
export function dotPath(at: MapPoint2D): string {
	return `M${round(at.x)},${round(at.y)}l0,0`
}

/** Two-decimal rounding keeping path strings compact. @internal */
function round(value: number): number {
	return Math.round(value * 100) / 100
}
