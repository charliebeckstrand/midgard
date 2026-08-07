/**
 * What the overlay marks draw: one lon/lat projected to the frame, and the path
 * strings a dot and a polyline paint from it. Held apart from `region.ts`
 * because the marks project point by point through a closure the plat hands
 * down, where the region layer projects whole features through `d3-geo`'s own
 * path generator.
 */

import type { GeoProjection } from 'd3-geo'
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
	const projected = points.flatMap((point) => {
		const at = project(point)

		return at ? [at] : []
	})

	if (projected.length < 2) return ''

	return projected
		.map((at, index) => `${index === 0 ? 'M' : 'L'}${round(at.x)},${round(at.y)}`)
		.join('')
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
