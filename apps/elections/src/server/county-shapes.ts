import { feature } from 'topojson-client'
import type { MapFeatureCollection } from 'ui/map'
import counties from 'us-atlas/counties-10m.json'

type Topology = Parameters<typeof feature>[0]

/** The county object of the atlas, which this reads structurally. */
type Atlas = {
	objects: { counties: { type: 'GeometryCollection'; geometries: { id?: string }[] } }
}

const atlas = counties as unknown as Atlas

/**
 * The decimals that a coordinate keeps. Three decimals of a degree are about
 * 100 meters, finer than a county map in the Drawer can show, and they halve the
 * size of the shapes.
 */
const PLACES = 1000

/** The shapes of each state that a reader opened, by FIPS code. Built once for each state. */
const byState = new Map<string, string>()

/**
 * The counties of a state from `us-atlas`, as one feature collection in JSON.
 * The id of each county is its 5-digit FIPS code, and its name is in
 * `properties.name`.
 *
 * @param stateFips - The 2-digit FIPS code of the state.
 */
export function countyShapes(stateFips: string): string {
	const cached = byState.get(stateFips)

	if (cached !== undefined) return cached

	const geometries = atlas.objects.counties.geometries.filter((county) =>
		county.id?.startsWith(stateFips),
	)

	const collection = feature(
		counties as unknown as Topology,
		{
			type: 'GeometryCollection',
			geometries,
		} as unknown as Parameters<typeof feature>[1],
	) as unknown as MapFeatureCollection

	const json = JSON.stringify(collection, (_key, value) =>
		typeof value === 'number' ? Math.round(value * PLACES) / PLACES : value,
	)

	byState.set(stateFips, json)

	return json
}
