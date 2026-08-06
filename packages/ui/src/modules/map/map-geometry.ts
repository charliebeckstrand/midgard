/**
 * Pure geometry plumbing for the map module: TopoJSON / GeoJSON
 * normalisation, region path generation, and lon/lat projection for the
 * overlay marks. Kept React-free beside `map-projection.ts` so the math is
 * unit-testable in isolation.
 */

import {
	type GeoPermissibleObjects,
	type GeoProjection,
	geoArea,
	geoCentroid,
	geoPath,
} from 'd3-geo'
import { feature } from 'topojson-client'
import { REGION_PATH_DIGITS } from './map-constants'
import type { LngLat, MapFeature, MapGeography } from './types'

/** A projected frame point for the overlay marks. @internal */
export type MapPoint2D = {
	x: number
	y: number
}

/**
 * Normalises prop-supplied geography to a flat feature list: a TopoJSON
 * topology decodes its named object (defaulting to the first key — atlas
 * packages lead with their primary layer), a GeoJSON collection passes its
 * features through. An unknown object name yields no features.
 *
 * @internal
 */
export function geographyFeatures(geography: MapGeography, objectName?: string): MapFeature[] {
	if (geography.type === 'FeatureCollection') return geography.features

	const name = objectName ?? Object.keys(geography.objects)[0]

	const object = name === undefined ? undefined : geography.objects[name]

	if (!object) return []

	const decoded = feature(
		geography as unknown as Parameters<typeof feature>[0],
		object as Parameters<typeof feature>[1],
	)

	return (decoded.type === 'FeatureCollection'
		? decoded.features
		: [decoded]) as unknown as MapFeature[]
}

/** A GeoJSON linear ring: a closed loop of `[lon, lat]` positions. @internal */
type Ring = number[][]

/** A polygonal geometry — the shapes ring-winding normalisation applies to. @internal */
type PolygonalGeometry =
	| { type: 'Polygon'; coordinates: Ring[] }
	| { type: 'MultiPolygon'; coordinates: Ring[][] }

/** Half the sphere in steradians: an exterior ring enclosing more is wound backwards. @internal */
const HALF_SPHERE = 2 * Math.PI

/** The whole sphere in steradians — reversing a ring flips its area to `SPHERE − area`. @internal */
const SPHERE = 4 * Math.PI

/**
 * Area below which a ring is junk under either winding: a collinear, zero-area
 * ring measures ~0 one way and ~{@link SPHERE} the other, so
 * `min(area, SPHERE − area)` collapses toward zero. Set well above the floating
 * residue such a ring leaves (~1e-13) and well below the smallest genuine region
 * (a 1 km² sliver spans ~2.5e-8 sr), so it parts degenerate rings from tiny real
 * ones.
 *
 * @internal
 */
const DEGENERATE_AREA_EPSILON = 1e-9

/** A single ring's spherical area, measured as its own polygon. @internal */
function ringArea(ring: Ring): number {
	return geoArea({ type: 'Polygon', coordinates: [ring] } as unknown as Parameters<
		typeof geoArea
	>[0])
}

/**
 * Rewinds one ring to d3-geo's spherical convention, or drops it. An exterior
 * ring must enclose less than {@link HALF_SPHERE}; a hole must be the opposite
 * winding, so it must enclose more. A ring degenerate either way
 * ({@link DEGENERATE_AREA_EPSILON}) returns `null` to be dropped. Reversal clones
 * the ring, so the caller's coordinates are never mutated.
 *
 * @internal
 */
function rewindRing(ring: Ring, exterior: boolean): Ring | null {
	const area = ringArea(ring)

	if (Math.min(area, SPHERE - area) < DEGENERATE_AREA_EPSILON) return null

	const misWound = exterior ? area > HALF_SPHERE : area < HALF_SPHERE

	return misWound ? [...ring].reverse() : ring
}

/**
 * Rewinds a polygon's rings — exterior first, holes after — dropping degenerate
 * ones. `null` when the exterior itself is degenerate (no drawable outline); the
 * same array when nothing changed; a fresh array of rings otherwise.
 *
 * @internal
 */
function rewindPolygon(rings: Ring[]): Ring[] | null {
	const [exteriorRing, ...holeRings] = rings

	if (exteriorRing === undefined) return rings

	const exterior = rewindRing(exteriorRing, true)

	if (exterior === null) return null

	const out: Ring[] = [exterior]

	let changed = exterior !== exteriorRing

	for (const holeRing of holeRings) {
		const hole = rewindRing(holeRing, false)

		if (hole === null || hole !== holeRing) changed = true

		if (hole !== null) out.push(hole)
	}

	return changed ? out : rings
}

/** Narrows a feature's opaque `geometry` to the polygonal shapes rewinding touches. @internal */
function polygonalGeometry(geometry: object | null): PolygonalGeometry | null {
	if (geometry === null) return null

	const type = (geometry as { type?: unknown }).type

	return type === 'Polygon' || type === 'MultiPolygon' ? (geometry as PolygonalGeometry) : null
}

/** Rewinds one feature's rings, returning it unchanged when nothing was rewound. @internal */
function rewindFeature(feature: MapFeature): MapFeature {
	const geometry = polygonalGeometry(feature.geometry)

	if (geometry === null) return feature

	if (geometry.type === 'Polygon') {
		const rings = rewindPolygon(geometry.coordinates)

		if (rings === geometry.coordinates) return feature

		return { ...feature, geometry: { ...geometry, coordinates: rings ?? [] } }
	}

	const polygons: Ring[][] = []

	let changed = false

	for (const polygon of geometry.coordinates) {
		const rewound = rewindPolygon(polygon)

		if (rewound === null || rewound !== polygon) changed = true

		if (rewound !== null) polygons.push(rewound)
	}

	return changed ? { ...feature, geometry: { ...geometry, coordinates: polygons } } : feature
}

/**
 * Returns the features with every Polygon / MultiPolygon ring wound to d3-geo's
 * spherical convention: an exterior ring enclosing more than half the sphere is
 * reversed — d3 reads a backwards exterior as the region's complement, flooding
 * the frame (and, under `albers-usa`, its inset clips) — and each hole is set to
 * the opposite winding. Collinear zero-area rings, junk under either winding, are
 * dropped; a polygon whose exterior is one is dropped whole.
 *
 * TopoJSON decodes with correct winding already, so this is a no-op there. It
 * guards the raw-GeoJSON path, where RFC 7946's counter-clockwise exteriors are
 * wound opposite d3's convention and would otherwise break wholesale. Only
 * changed rings are cloned — the caller's geometry is never mutated — so an
 * already-correct collection returns feature-for-feature unchanged.
 *
 * @internal
 */
export function rewindFeatures(features: MapFeature[]): MapFeature[] {
	let changed = false

	const out = features.map((feature) => {
		const rewound = rewindFeature(feature)

		if (rewound !== feature) changed = true

		return rewound
	})

	return changed ? out : features
}

/**
 * Each region's SVG path under the fitted projection, index-aligned with the
 * features; `null` where a feature has no drawable geometry.
 *
 * @internal
 */
export function regionPaths(features: MapFeature[], projection: GeoProjection): (string | null)[] {
	const path = geoPath(projection).digits(REGION_PATH_DIGITS)

	return features.map((entry) =>
		entry.geometry === null ? null : path(entry as GeoPermissibleObjects),
	)
}

/**
 * Each region's spherical centroid as `[lon, lat]`, index-aligned with the
 * features; `null` where a feature carries no geometry, or where its rings
 * cancel to no centre. The keyboard cursor anchors its readout to these, and
 * steps by the compass bearing between them.
 *
 * Deliberately in lon/lat, not in frame units: a centroid is a property of the
 * geography, so one pass per atlas serves every fit and a resize re-projects the
 * result instead of measuring the rings again. `geoCentroid` is spherical, so a
 * region that crosses the antimeridian centres correctly where a mean of its
 * projected coordinates would not.
 *
 * @internal
 */
export function regionCentroids(features: MapFeature[]): (LngLat | null)[] {
	return features.map((entry) => {
		if (entry.geometry === null) return null

		const [lon, lat] = geoCentroid(entry as GeoPermissibleObjects)

		// A degenerate feature — empty rings, or rings that cancel — centres on
		// NaN; drop it rather than let the cursor step onto a point that projects
		// nowhere.
		return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
	})
}

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
 * The geographic middle of a line of points — where a line-shaped mark anchors
 * its keyboard stop, so the cursor lands on the mark rather than at one end,
 * where several routes out of one depot would stack on the shared origin.
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
export function lineAnchor(points: LngLat[]): LngLat | null {
	const half = points.length / 2

	if (points.length === 0) return null

	if (points.length % 2 === 1) return points[Math.floor(half)] ?? null

	const before = points[half - 1]

	const after = points[half]

	if (before === undefined || after === undefined) return null

	return [(before[0] + after[0]) / 2, (before[1] + after[1]) / 2]
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
