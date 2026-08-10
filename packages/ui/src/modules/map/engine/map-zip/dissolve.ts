/**
 * The territory a set of ZIP codes covers, as one drawable shape. The codes the
 * matcher holds are gathered out of the atlas and their rings become the zone a
 * `MapGeofence` draws — the whole point of the pass, since a broker states
 * coverage in codes and a map draws it in ground.
 *
 * A topology dissolves exactly. TopoJSON stores each shared border once as an
 * arc, so `merge` drops the arcs the selected codes share and keeps the ones
 * only one of them holds: the seams between neighbouring codes disappear, an
 * uncovered code inside a covered ring comes out as a hole, and two separate
 * clusters come out as two polygons. Nothing is clipped and nothing is rounded,
 * because the operation is over the arc index rather than over coordinates.
 *
 * GeoJSON cannot do that. Its features repeat every shared border as two
 * independent runs of coordinates, and reconciling them needs a polygon-clipping
 * pass this module does not carry. So a feature collection gathers instead: each
 * matched code keeps its own rings, and the zone reads as a mesh of codes rather
 * than as one territory. Pass a topology where the seams matter.
 */

import { feature, merge } from 'topojson-client'
import { decodedFeatures, topologyObject } from '../map-geometry/topology'
import type { MapFeature, MapGeography, MapPolygons, MapShape, MapTopology } from '../types'

/**
 * The property names a ZCTA source names its code in, in the order they are
 * read. The Census files lead the list — `ZCTA5CE20` is the 2020 vintage,
 * `ZCTA5CE10` the 2010 one — and the plain names follow for a hand-built atlas.
 *
 * @internal
 */
const ZIP_PROPERTY_NAMES = [
	'ZCTA5CE20',
	'ZCTA5CE10',
	'ZCTA5CE',
	'ZCTA5',
	'GEOID20',
	'GEOID10',
	'GEOID',
	'zip',
	'zipcode',
	'postalCode',
]

/**
 * The default ZIP identity: the shape's own `id`, else the first of the known
 * code properties it carries. A Census ZCTA file satisfies this as-is, in either
 * vintage; anything else takes the `zipId` override.
 *
 * @internal
 */
export function defaultZipId(shape: MapShape): string {
	if (shape.id !== undefined && shape.id !== null) return String(shape.id)

	const { properties } = shape

	if (!properties) return ''

	for (const name of ZIP_PROPERTY_NAMES) {
		const value = properties[name]

		if (typeof value === 'string' || typeof value === 'number') return String(value)
	}

	return ''
}

/**
 * A drawn territory: the codes it holds, the shapes they came from, and the
 * rings that draw it.
 *
 * @internal
 */
export type MapZipArea = {
	/** The matched codes, in the atlas's own order. */
	codes: string[]
	/**
	 * The matched features, wound as their source wound them. Read for the pass
	 * that finds which regions the territory lands in, so that pass measures each
	 * code rather than the merged whole — a territory over a state line still
	 * names both states.
	 *
	 * Not rewound here, because rewinding measures a spherical area for every ring
	 * and the pass that reads these measures almost none of them: it settles most
	 * codes from a bounding box, which no winding can change. So the rewind sits
	 * with the measurement that needs it, and a territory pays it per code it
	 * actually has to place rather than per code it holds.
	 */
	features: MapFeature[]
	/** The rings: polygon, then ring, then position. Empty where nothing matched. */
	polygons: MapPolygons
	/**
	 * Whether the rings dissolved exactly. False for a feature collection, where
	 * the interior seams between neighbouring codes stay drawn.
	 */
	dissolved: boolean
}

/** Nothing matched — the shared empty territory, so a miss allocates nothing. @internal */
const NO_AREA: MapZipArea = { codes: [], features: [], polygons: [], dissolved: false }

/** Whether a shape is one this pass can draw; `merge` takes areas alone. @internal */
function isArea(shape: MapShape): boolean {
	return shape.type === 'Polygon' || shape.type === 'MultiPolygon'
}

/** A feature's rings, in the polygon-then-ring shape both geometry kinds flatten to. @internal */
function featureRings(shape: MapFeature): MapPolygons {
	const geometry = shape.geometry

	if (geometry === null) return []

	if (geometry.type === 'Polygon') return [geometry.coordinates as MapPolygons[number]]

	if (geometry.type === 'MultiPolygon') return geometry.coordinates as MapPolygons

	return []
}

/** The geometries a topology object holds, whether it collects them or is one itself. @internal */
function topologyGeometries(object: object): MapShape[] {
	const collection = object as { geometries?: MapShape[] }

	return collection.geometries ?? [collection as MapShape]
}

/**
 * The territory a topology's matched codes dissolve to. The matched geometries
 * decode for their identities and merge for their outline, so one filter serves
 * both and the two can never name different codes.
 *
 * @internal
 */
function dissolveTopology(
	topology: MapTopology,
	objectName: string | undefined,
	matches: (code: string) => boolean,
	zipId: (shape: MapShape) => string,
): MapZipArea {
	const object = topologyObject(topology, objectName)

	if (!object) return NO_AREA

	const matched = topologyGeometries(object).filter(
		(geometry) => isArea(geometry) && matches(zipId(geometry)),
	)

	if (matched.length === 0) return NO_AREA

	// One decode over the matched geometries alone, not over the atlas: a
	// territory is tens or hundreds of codes against tens of thousands in the
	// file, so this never approaches the cost of drawing the atlas itself.
	const features = decodedFeatures(
		feature(
			topology as unknown as Parameters<typeof feature>[0],
			{
				type: 'GeometryCollection',
				geometries: matched,
			} as unknown as Parameters<typeof feature>[1],
		),
	)

	const merged = merge(
		topology as unknown as Parameters<typeof merge>[0],
		matched as unknown as Parameters<typeof merge>[1],
	)

	return {
		codes: matched.map(zipId),
		features,
		polygons: merged.coordinates as MapPolygons,
		dissolved: true,
	}
}

/**
 * The territory a feature collection's matched codes gather to. Each code keeps
 * its own rings — see the note at the top of this file on why they cannot merge.
 *
 * @internal
 */
function gatherFeatures(
	features: MapFeature[],
	matches: (code: string) => boolean,
	zipId: (shape: MapShape) => string,
): MapZipArea {
	const matched = features.filter((shape) => matches(zipId(shape)))

	if (matched.length === 0) return NO_AREA

	return {
		codes: matched.map(zipId),
		features: matched,
		polygons: matched.flatMap(featureRings),
		dissolved: false,
	}
}

/**
 * The territory a set of ZIP codes covers, drawn from prop-supplied ZIP
 * geography. A topology dissolves its interior seams away; a feature collection
 * keeps them.
 *
 * @param geography - The ZIP geometry: a topology, or a feature collection.
 * @param objectName - Which topology object holds the codes; defaults to the first.
 * @param matches - The compiled territory test, from `zipMatcher`.
 * @param zipId - How a shape names its code.
 * @returns The matched codes, their features, and the rings that draw them.
 *
 * @internal
 */
export function zipArea(
	geography: MapGeography | null | undefined,
	objectName: string | undefined,
	matches: (code: string) => boolean,
	zipId: (shape: MapShape) => string = defaultZipId,
): MapZipArea {
	if (geography == null) return NO_AREA

	return geography.type === 'FeatureCollection'
		? gatherFeatures(geography.features, matches, zipId)
		: dissolveTopology(geography, objectName, matches, zipId)
}
