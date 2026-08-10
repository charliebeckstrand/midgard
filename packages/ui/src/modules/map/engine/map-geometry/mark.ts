/**
 * What the overlay marks draw: one lon/lat projected to the frame, the path
 * strings a dot, a polyline, and a closed ring paint from it, the anchor each
 * shape offers the keyboard cursor, and how much room an area's own face holds.
 * Held apart from `region.ts` because the marks project point by point through a
 * closure the plat hands down, where the region layer projects whole features
 * through `d3-geo`'s own path generator.
 *
 * That point-by-point walk is what bounds the ring: it draws each edge straight
 * in the frame, where `geoPath` would resample the edge along the sphere and
 * clip it at the antimeridian. A geofence over a metro or a state reads the same
 * either way, and one that wraps the world does not — so the marks keep the
 * cheap walk and the region layer keeps the exact one.
 */

import { type GeoProjection, geoArea, geoCentroid } from 'd3-geo'
import type { LngLat, MapPoint2D, MapPolygons } from '../types'

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
 * vertex stands in, which is a position the projection can draw. A lone point
 * reads as its own repeat and falls through that same door, so it anchors on
 * itself exactly rather than on a centroid round trip.
 *
 * @internal
 */
export function ringAnchor(ring: LngLat[]): LngLat[] {
	const first = ring[0]

	if (first === undefined) return []

	const last = ring[ring.length - 1]

	const closed =
		last !== undefined &&
		Math.abs(last[0] - first[0]) < SAME_POSITION_EPSILON &&
		Math.abs(last[1] - first[1]) < SAME_POSITION_EPSILON

	const coordinates = closed ? ring.slice(0, -1) : ring

	const [lon, lat] = geoCentroid({ type: 'MultiPoint', coordinates })

	return Number.isFinite(lon) && Number.isFinite(lat) ? [[lon, lat]] : [first]
}

/**
 * A frame-space box around a projected ring — the cheap reject a reader tries
 * before it walks a ring's edges, which is how a zone tells a dot standing
 * nowhere near it from one competing for its ground. Frame coordinates, so it is
 * named for the frame's own axes rather than for the compass, which
 * `map-geometry/locate`'s lon/lat box is.
 *
 * @internal
 */
type MapFrameBox = { left: number; top: number; right: number; bottom: number }

/**
 * One of an area's projected rings: the frame points it draws through, and the
 * box that bounds them. The two travel together rather than in parallel arrays,
 * so a ring can never be measured against another ring's bounds.
 *
 * @internal
 */
export type MapAreaRing = {
	points: MapPoint2D[]
	box: MapFrameBox
}

/**
 * Whether any of an area's rings draws within `margin` frame units of a position
 * — the cheap reject, on the boxes {@link projectArea} already measured, before
 * anything walks an edge. It is how a zone tells a dot standing nowhere near it
 * from one competing for its ground.
 *
 * The margin grows every box rather than shrinking the question, so one call
 * answers both readings a caller could want: `0` asks which rings the position
 * could fall inside, and a reach asks which it could be crowded by.
 *
 * A box holding the position does not mean the ring does — a box is a superset of
 * the shape inside it. That is the whole of what this claims, and it is why the
 * answer is a reject rather than a placement.
 *
 * @param rings - The projected rings, from {@link projectArea}.
 * @param at - The frame position to place.
 * @param margin - How far outside a box still counts, in frame units.
 * @returns Whether the position falls in any grown box.
 *
 * @internal
 */
export function ringsNear(rings: readonly MapAreaRing[], at: MapPoint2D, margin: number): boolean {
	// A loop rather than `some`: every dot on a map asks this of every zone, and a
	// callback would be a fresh allocation per call rather than per zone.
	for (const { box } of rings) {
		if (
			at.x >= box.left - margin &&
			at.x <= box.right + margin &&
			at.y >= box.top - margin &&
			at.y <= box.bottom + margin
		) {
			return true
		}
	}

	return false
}

/** The box around a run of frame points, walked as they are collected. @internal */
function boundPoints(points: readonly MapPoint2D[]): MapFrameBox {
	const box = {
		left: Number.POSITIVE_INFINITY,
		top: Number.POSITIVE_INFINITY,
		right: Number.NEGATIVE_INFINITY,
		bottom: Number.NEGATIVE_INFINITY,
	}

	for (const at of points) {
		if (at.x < box.left) box.left = at.x

		if (at.x > box.right) box.right = at.x

		if (at.y < box.top) box.top = at.y

		if (at.y > box.bottom) box.bottom = at.y
	}

	return box
}

/**
 * The frame rings an area projects to: every ring of every polygon, with the
 * points the projector drops left out and any ring left under three of them
 * dropped whole — three being the fewest an area can hold, so an inset that
 * clips half a territory away keeps the half it kept.
 *
 * The rings come back as points rather than as a string, because two readers ask
 * the same geometry two questions: {@link ringsPath} draws it, and
 * {@link areaReach} measures how much room it holds. Projecting once for both is
 * what keeps the drawn shape and the ground it answers for from ever disagreeing.
 *
 * Each ring carries its own bounds, measured on the walk that collects it — free
 * here, and what lets a zone reject a dot it stands nowhere near without touching
 * an edge of it.
 *
 * @internal
 */
export function projectArea(
	polygons: MapPolygons,
	project: (position: LngLat) => MapPoint2D | null,
): MapAreaRing[] {
	const rings: MapAreaRing[] = []

	for (const polygon of polygons) {
		for (const ring of polygon) {
			const points = projectRun(ring, project)

			if (points.length >= 3) rings.push({ points, box: boundPoints(points) })
		}
	}

	return rings
}

/**
 * The SVG path through projected rings, each closed, in one string.
 *
 * The rings concatenate and nothing marks which is which, because nothing has
 * to: the mark paints under the even-odd fill rule, where a ring inside another
 * ring is a hole whichever way either one winds. That is what lets a dissolved
 * shape draw exactly as it arrives — a merged topology hands back its rings in
 * the winding its arcs held, and no pass has to sort outers from inners or
 * rewind either.
 *
 * @internal
 */
export function ringsPath(rings: readonly MapAreaRing[]): string {
	let path = ''

	for (const ring of rings) path += `${polylineCommands(ring.points)}Z`

	return path
}

/**
 * How far into the area a mark can stand before its widest part reaches the
 * boundary — the radius of the largest circle the shape holds, near enough. It
 * is `2 · area / perimeter`, which is that radius exactly for a circle (the form
 * `circleRing` draws, and so most zones on a map) and reads a long thin corridor
 * as its width rather than its diagonal, which is where a bounding box goes
 * wrong by an order of magnitude.
 *
 * The largest part answers for the whole, the way {@link areaAnchor} stands on
 * it: a territory in two distant clusters has no single measure, and the
 * cluster a reader is looking at is the one with room in it.
 *
 * Zero where nothing drew. Signed area is taken absolute rather than summed, so
 * the winding a dissolved topology arrived in cannot flip the answer — this asks
 * how much room the shape has, not which side of it is in.
 *
 * Every ring counts, holes included, so a zone drawn as a band around a large
 * hole reads the room its outer ring would hold rather than the band's own width.
 * The cause is the shape this reads, not the winding: {@link projectArea} flattens
 * the polygons to one ring list, because {@link ringsPath} needs no more than
 * that, so which ring opened a polygon is gone before this measures. Keeping that
 * grouping is what a band would need — the outer ring's area less its holes', over
 * the whole boundary — and it costs the flat list every other reader here wants.
 * The reading errs generous, so the dot keeps more of its target rather than less,
 * and a zone of that shape is rare enough to leave the grouping unbuilt.
 *
 * @param rings - The projected rings, from {@link projectArea}.
 * @returns The inscribed reach in frame units, `0` for an area with no extent.
 *
 * @internal
 */
export function areaReach(rings: readonly MapAreaRing[]): number {
	let widest = 0

	for (const ring of rings) {
		const { points } = ring

		let twiceArea = 0

		let perimeter = 0

		for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
			const to = points[index]

			const from = points[previous]

			if (to === undefined || from === undefined) continue

			twiceArea += from.x * to.y - to.x * from.y

			const runX = to.x - from.x

			const runY = to.y - from.y

			// `Math.hypot` buys overflow safety these viewport-sized coordinates never
			// need, at several times the cost of the products — the chart module's own
			// verdict (`chart-geometry/scatter.ts`), and this is the only transcendental
			// in a walk that reads every vertex of a dissolved territory.
			perimeter += Math.sqrt(runX * runX + runY * runY)
		}

		if (perimeter > 0) widest = Math.max(widest, Math.abs(twiceArea) / perimeter)
	}

	return widest
}

/** The sphere's whole area in steradians — what a backwards ring measures against. @internal */
const WHOLE_SPHERE_STERADIANS = 4 * Math.PI

/**
 * The middle of an area's largest polygon, as the stop list a multi-part mark
 * registers. {@link ringAnchor}'s contract for the shape that holds more than
 * one part.
 *
 * The largest part rather than the whole: a territory of two distant clusters
 * has no middle that stands on it, and the cursor must land on the mark and not
 * between its pieces. Size is read as the enclosed area of the outer ring, and
 * read winding-blind — a backwards ring measures as the whole sphere less its
 * own area, so the smaller of the two readings is the one the ring means, and a
 * dissolved shape needs no rewinding pass to be measured.
 *
 * @internal
 */
export function areaAnchor(polygons: MapPolygons): LngLat[] {
	// One part has nothing to be measured against, and every circle and lone
	// boundary in the module arrives here as one. Measuring anyway would put a
	// spherical area pass in front of a case that had never paid one.
	if (polygons.length <= 1) return ringAnchor(polygons[0]?.[0] ?? [])

	let widest: LngLat[] | undefined

	let widestArea = -1

	for (const polygon of polygons) {
		const outer = polygon[0]

		if (outer === undefined || outer.length === 0) continue

		const area = geoArea({ type: 'Polygon', coordinates: [outer] })

		const enclosed = Math.min(area, WHOLE_SPHERE_STERADIANS - area)

		if (enclosed > widestArea) {
			widestArea = enclosed

			widest = outer
		}
	}

	return widest === undefined ? [] : ringAnchor(widest)
}

/**
 * A dot's SVG path: a zero-length segment whose round cap paints the circle.
 *
 * Drawn as a stroke — not a `<circle>` — because a stroke width could ride
 * device pixels through `vector-effect="non-scaling-stroke"` where a radius
 * could not. The marks size themselves now (`MapDot`), so the two shapes would
 * draw the same and a `<circle>` would say it more plainly. The stroke stays
 * for now: swapping it moves the pop-in, the halo, and the hit geometry with
 * it, which is wider than the sizing change that freed it.
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
