import { type GeoProjection, geoBounds, geoCentroid, geoContains, geoMercator } from 'd3-geo'
import { feature } from 'topojson-client'
import type { MapFeature, MapFeatureCollection, MapTopology } from 'ui/modules/map'
import type { Place } from '../types'

/**
 * A region and the box that holds it: `[[west, south], [east, north]]`.
 *
 * A region is whatever the drawn atlas divides into — a state of the United
 * States, or a country of the world. Nothing below reads the grain, so one set
 * of functions serves both atlases.
 */
export type BoundedRegion = {
	name: string
	feature: MapFeature
	bounds: [[number, number], [number, number]]
}

/**
 * Whether a position falls inside a region's box, which is the cheap half of the
 * question.
 *
 * A box that crosses the antimeridian comes back wrapped — `geoBounds` reports
 * Alaska as west 172.46, east -129.98 — so the longitude test has to read the
 * two sides as an outside rather than an inside. Compared as a plain range it
 * rejected every point in the region, and Alaska fell through to the geocoder's
 * own name for want of a box test that could hold it.
 */
function withinBounds(bounds: BoundedRegion['bounds'], [lon, lat]: [number, number]): boolean {
	const [[west, south], [east, north]] = bounds

	const withinLon = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east

	return withinLon && lat >= south && lat <= north
}

/** How a region names itself in a us-atlas or world-atlas topology. */
export function regionName(shape: MapFeature): string {
	return String(shape.properties?.name ?? shape.id)
}

/**
 * Decodes one object's regions out of a TopoJSON topology.
 *
 * `key` names the object to draw — `states` for us-atlas, `countries` for
 * world-atlas — and the first object stands in where the atlas names it
 * something else.
 *
 * Decoded here rather than handed to the map whole, because the drill reads one
 * region out of the set and a topology has no single region to read.
 */
export function decodeRegions(
	topology: MapTopology | undefined,
	key: string,
): MapFeatureCollection | null {
	if (topology === undefined) return null

	const object = topology.objects[key] ?? Object.values(topology.objects)[0]

	if (object === undefined) return null

	// `topojson-client` types its own topology shape; the module's structural
	// `MapTopology` satisfies it at runtime and the two are not assignable.
	return feature(
		topology as Parameters<typeof feature>[0],
		object as Parameters<typeof feature>[1],
	) as unknown as MapFeatureCollection
}

/**
 * A projection centred on what it is about to draw.
 *
 * Mercator centres on the prime meridian, so a subject far from it is fitted
 * across a span it does not occupy. Alaska is the case that shows it: the
 * Aleutians cross the antimeridian, so its bounds read as most of the globe and
 * the state fits to a fraction of the frame. Rotating the projection to the
 * subject's own centroid puts it on the meridian, which un-wraps Alaska and
 * takes the shear off every other region as a bonus.
 *
 * `null` for nothing to centre on, which the caller reads as the plain named
 * projection.
 */
export function centredProjection(geography: MapFeatureCollection | null): GeoProjection | null {
	if (geography === null || geography.features.length === 0) return null

	const [longitude] = geoCentroid(geography as Parameters<typeof geoCentroid>[0])

	if (!Number.isFinite(longitude)) return null

	return geoMercator().rotate([-longitude, 0])
}

/**
 * One region's own geometry, as a collection of one, for the map to draw alone.
 * An unknown name draws the whole atlas back, which is where a drill that cannot
 * resolve its region belongs.
 */
export function regionFrame(
	regions: MapFeatureCollection | null,
	name: string | null,
): MapFeatureCollection | null {
	if (regions === null || name === null) return regions

	const held = regions.features.find((region) => regionName(region) === name)

	return held === undefined ? regions : { type: 'FeatureCollection', features: [held] }
}

/**
 * Each region beside the box that holds it.
 *
 * Split from the grouping because it depends on the atlas alone, and an atlas
 * never changes for the life of the tab. Measured over the 56 states and their
 * 14,456 coordinate pairs it is ~2.7 ms, which is most of a grouping pass at any
 * realistic number of places — so it is resolved once and handed in rather than
 * rebuilt every time a place is added.
 */
export function boundRegions(regions: MapFeatureCollection | null): BoundedRegion[] {
	if (regions === null) return []

	return regions.features.flatMap((held) =>
		held.geometry === null
			? []
			: [{ name: regionName(held), feature: held, bounds: geoBounds(held.geometry) }],
	)
}

/**
 * Which region holds each place, keyed by the region's own name.
 *
 * The drawn geometry answers first, so the map and the drill agree about where a
 * point is: a place is in the region whose shape contains it, and that is the
 * same shape the drill opens.
 *
 * `fallback` answers where the geometry does not, and it is the caller's because
 * the field that answers depends on the atlas: a states atlas falls back to the
 * geocoder's state, a countries atlas to its country. An atlas is a generalized
 * outline, and a coastal place can sit a few hundred metres outside it — the
 * Oregon coast is most of what an Oregon map is for, and every lighthouse and
 * pier on it fell into no region at all under geometry alone. The fallback is
 * checked against the drawn regions, so a name the atlas does not carry still
 * resolves to nothing rather than to a region that is not on the map.
 *
 * A place that neither answers — offshore, or off the atlas — belongs to no
 * region and opens no drill. It still draws on the map, because a dot is a
 * position and not a membership.
 *
 * Each region's box is tested before its outline, so a place only pays the
 * polygon pass for the handful of regions whose box it falls in. `geoContains`
 * walks every ring of the region it is asked about — the states atlas is 14,456
 * coordinate pairs — and a place outside every region paid all of it before
 * reaching the fallback. Measured over 200 places: 110 ms to 2.4 ms, for the
 * same grouping. The boxes come from {@link boundRegions}.
 */
export function groupPlacesByRegion(
	bounded: readonly BoundedRegion[],
	places: readonly Place[],
	fallback: (place: Place) => string | undefined,
): Map<string, Place[]> {
	const grouped = new Map<string, Place[]>()

	const drawn = new Set(bounded.map((region) => region.name))

	for (const place of places) {
		const at: [number, number] = [place.longitude, place.latitude]

		const held = bounded.find(
			(region) =>
				withinBounds(region.bounds, at) &&
				region.feature.geometry !== null &&
				geoContains(region.feature.geometry, at),
		)

		const named = fallback(place)

		const name =
			held !== undefined ? held.name : named !== undefined && drawn.has(named) ? named : null

		if (name === null) continue

		const known = grouped.get(name)

		if (known === undefined) grouped.set(name, [place])
		else known.push(place)
	}

	return grouped
}
