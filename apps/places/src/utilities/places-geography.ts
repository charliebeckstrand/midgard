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
function withinBounds(
	bounds: BoundedRegion['bounds'],
	[lon, lat]: [number, number],
	pad = 0,
): boolean {
	const [[west, south], [east, north]] = bounds

	const withinLon =
		west <= east ? lon >= west - pad && lon <= east + pad : lon >= west - pad || lon <= east + pad

	return withinLon && lat >= south - pad && lat <= north + pad
}

/** Kilometres along a degree of latitude, which is the scale the local frame below measures in. */
const KM_PER_DEGREE = 111.195

/** Degrees of latitude in a kilometre, for padding a box by a distance. Longitude is narrower away from the equator, so this over-pads rather than under-pads — the box only decides who is worth measuring. */
const DEGREES_PER_KM = 1 / KM_PER_DEGREE

/** A longitude difference read the short way round, so a pair either side of the antimeridian is two degrees apart rather than 358. */
function longitudeDelta(from: number, to: number): number {
	return ((to - from + 540) % 360) - 180
}

/**
 * How far a position lies from one edge of a ring, in kilometres.
 *
 * Measured on a plane tangent at the position, with longitude scaled by its
 * cosine. The tolerances this serves are tens of kilometres, where that frame
 * and the sphere agree to well under a percent — and unlike a distance to the
 * ring's vertices, it holds however far apart a generalized atlas spaces them.
 * A coastline drawn at 110m runs hundreds of kilometres between vertices, so a
 * harbour off the middle of one edge reads as far from both of its ends and no
 * distance from the edge itself.
 */
function edgeKm(
	at: [number, number],
	[fromLon, fromLat]: [number, number],
	[toLon, toLat]: [number, number],
): number {
	const scale = Math.cos((at[1] * Math.PI) / 180)

	const ax = longitudeDelta(at[0], fromLon) * scale

	const ay = fromLat - at[1]

	const bx = longitudeDelta(at[0], toLon) * scale

	const by = toLat - at[1]

	const runX = bx - ax

	const runY = by - ay

	const length = runX * runX + runY * runY

	// Where along the edge the nearest point falls, clamped to its two ends so a
	// position beside an edge measures to the edge and one past its end measures
	// to that end.
	const along = length === 0 ? 0 : Math.min(1, Math.max(0, -(ax * runX + ay * runY) / length))

	return Math.hypot(ax + along * runX, ay + along * runY) * KM_PER_DEGREE
}

/** Every ring of an area geometry. Anything else has none. */
function rings(geometry: NonNullable<MapFeature['geometry']>): [number, number][][] {
	if (geometry.type === 'Polygon') return geometry.coordinates as [number, number][][]

	if (geometry.type === 'MultiPolygon') {
		return geometry.coordinates.flat() as [number, number][][]
	}

	return []
}

/**
 * The drawn region nearest a position, where one lies within `withinKm`.
 *
 * It exists because an atlas is a drawing and not a survey. `world-atlas` at
 * 110m generalizes a coastline into a line that runs inland of the harbours,
 * piers and beach towns a travel log is full of, so `geoContains` answers `false`
 * for a place plainly inside the country — Newport, Oregon sits 3.1 km outside
 * the United States as that atlas draws it.
 *
 * Distance is measured to the region's edges, not to its vertices — see
 * {@link edgeKm} for why that matters on an atlas this coarse.
 *
 * It is the caller's tolerance because it belongs to the atlas, not to this
 * function. The coarser the drawing the more slack a rescue needs, and the more
 * a wrong answer costs: whatever sits outside every region of a world atlas is
 * water, where the nearest coast is the right answer, while outside every region
 * of a states atlas lies Canada and Mexico, where it is not.
 *
 * Only positions no region contains reach here, so the edge walk is paid for the
 * rare miss. The box test comes first and rejects most regions outright: a point
 * off Oregon measures against the United States alone.
 */
export function nearestRegion(
	bounded: readonly BoundedRegion[],
	at: [number, number],
	withinKm: number,
): string | null {
	const pad = withinKm * DEGREES_PER_KM

	let nearest: string | null = null

	let shortest = Number.POSITIVE_INFINITY

	for (const region of bounded) {
		if (region.feature.geometry === null) continue

		if (!withinBounds(region.bounds, at, pad)) continue

		for (const ring of rings(region.feature.geometry)) {
			for (let step = 1; step < ring.length; step++) {
				const from = ring[step - 1]

				const to = ring[step]

				if (from === undefined || to === undefined) continue

				const km = edgeKm(at, from, to)

				if (km < shortest) {
					shortest = km

					nearest = region.name
				}
			}
		}
	}

	return shortest <= withinKm ? nearest : null
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

/** The answers {@link groupPlacesByRegion} takes beyond the geometry and the name. */
export type GroupPlacesOptions = {
	/** An answer settled off a finer atlas, trusted ahead of the drawn geometry. */
	known?: (place: Place) => string | undefined
	/**
	 * How far a position may sit outside every region and still be rescued by the
	 * nearest one, in kilometres. Omit for no rescue, which is what an atlas fine
	 * enough to contain its own coastline wants. See {@link nearestRegion}.
	 */
	snapKm?: number
}

/**
 * Which region holds each place, keyed by the region's own name.
 *
 * Four answers, in the order they are trusted.
 *
 * `known` is settled before this pass ran and beats the geometry, because it was
 * read off a finer atlas than the one drawn here — a place a 10m atlas put in a
 * state is in that country whatever a 110m outline of it says. It is also the
 * cheap answer: a place it names pays no bounds test and no ring walk at all.
 * Measured over 200 places inside the United States, grouping them against the
 * world costs 15.9 ms of `geoContains` without it and 0.11 ms with it.
 *
 * The drawn geometry answers next, so the map and the drill agree about where a
 * point is: a place is in the region whose shape contains it, and that is the
 * same shape the drill opens.
 *
 * `snapKm` then rescues what the drawing missed rather than what the geocoder
 * knows — see {@link nearestRegion}, and note that the tolerance belongs to the
 * atlas: a states atlas must not be given one, because outside its regions lies
 * Mexico and a border city snaps across it.
 *
 * `fallback` answers last, and it is the caller's because the field that answers
 * depends on the atlas. It is checked against the drawn regions, so a name the
 * atlas does not carry resolves to nothing rather than to a region that is not
 * on the map. `known` and the snap are not checked that way: one is a name this
 * app chose and the other is a name the atlas itself gave.
 *
 * A place that none of the four answers — mid-ocean, or off the atlas — belongs
 * to no region and opens no drill. It still draws on the map, because a dot is a
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
	{ known, snapKm }: GroupPlacesOptions = {},
): Map<string, Place[]> {
	const grouped = new Map<string, Place[]>()

	const drawn = new Set(bounded.map((region) => region.name))

	/** Adds one place under a region, starting that region's list where it is the first. */
	function hold(name: string, place: Place): void {
		const list = grouped.get(name)

		if (list === undefined) grouped.set(name, [place])
		else list.push(place)
	}

	for (const place of places) {
		const settled = known?.(place)

		if (settled !== undefined) {
			hold(settled, place)

			continue
		}

		const at: [number, number] = [place.longitude, place.latitude]

		const held = bounded.find(
			(region) =>
				withinBounds(region.bounds, at) &&
				region.feature.geometry !== null &&
				geoContains(region.feature.geometry, at),
		)

		if (held !== undefined) {
			hold(held.name, place)

			continue
		}

		const snapped = snapKm === undefined ? null : nearestRegion(bounded, at, snapKm)

		if (snapped !== null) {
			hold(snapped, place)

			continue
		}

		const named = fallback(place)

		if (named === undefined || !drawn.has(named)) continue

		hold(named, place)
	}

	return grouped
}
