import { type GeoPermissibleObjects, geoBounds, geoContains } from 'd3-geo'
import type { LngLat } from 'ui/map'
import { cities } from '../../../../data/places.ts'
import { stateName, states } from '../data.ts'

/**
 * The delivery stops of one day, in four rounds. Each round has a depot and a
 * group of stops near it. When the map shows the full country, each depot and
 * the stops near it merge into summaries. A stop far from its depot, such as El
 * Paso, shows apart. When the map shows one state, more stops of that state
 * show apart.
 */
const stops: { city: string; at: LngLat; parcels?: number }[] = [
	{ city: cities.dallas, at: [-96.8, 32.78] },
	{ city: cities.plano, at: [-96.7, 33.02], parcels: 6 },
	{ city: cities.arlington, at: [-97.11, 32.74], parcels: 9 },
	{ city: cities.fortWorth, at: [-97.33, 32.76], parcels: 14 },
	{ city: cities.denton, at: [-97.13, 33.21], parcels: 11 },
	{ city: cities.waco, at: [-97.15, 31.55], parcels: 7 },
	{ city: cities.austin, at: [-97.74, 30.27], parcels: 12 },
	{ city: cities.sanAntonio, at: [-98.49, 29.42], parcels: 10 },
	{ city: cities.houston, at: [-95.37, 29.76], parcels: 18 },
	{ city: cities.elPaso, at: [-106.49, 31.76], parcels: 4 },
	{ city: cities.losAngeles, at: [-118.24, 34.05] },
	{ city: cities.longBeach, at: [-118.19, 33.77], parcels: 8 },
	{ city: cities.anaheim, at: [-117.91, 33.84], parcels: 5 },
	{ city: cities.riverside, at: [-117.38, 33.95], parcels: 9 },
	{ city: cities.sanDiego, at: [-117.16, 32.72], parcels: 13 },
	{ city: cities.fresno, at: [-119.79, 36.74], parcels: 6 },
	{ city: cities.sanFrancisco, at: [-122.42, 37.77], parcels: 15 },
	{ city: cities.sacramento, at: [-121.49, 38.58], parcels: 7 },
	{ city: cities.chicago, at: [-87.63, 41.88] },
	{ city: cities.naperville, at: [-88.15, 41.79], parcels: 5 },
	{ city: cities.joliet, at: [-88.08, 41.53], parcels: 7 },
	{ city: cities.rockford, at: [-89.09, 42.27], parcels: 4 },
	{ city: cities.springfield, at: [-89.65, 39.8], parcels: 9 },
	{ city: cities.atlanta, at: [-84.39, 33.75] },
	{ city: cities.marietta, at: [-84.55, 33.95], parcels: 6 },
	{ city: cities.macon, at: [-83.63, 32.84], parcels: 8 },
	{ city: cities.savannah, at: [-81.1, 32.08], parcels: 11 },
]

/**
 * Each stop with its label and its readout. A depot has no parcels, its label
 * names it as a depot, and its readout is "Origin".
 */
export const deliveryStops = stops.map((stop) => ({
	...stop,
	label: stop.parcels === undefined ? `${stop.city} depot` : stop.city,
	detail: stop.parcels === undefined ? 'Origin' : `${stop.parcels} parcels`,
}))

/** Whether a position is in a `geoBounds` box. A box across the antimeridian has its west edge east of its east edge. */
function withinBox([[west, south], [east, north]]: [LngLat, LngLat], [lon, lat]: LngLat): boolean {
	const inLongitude = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east

	return inLongitude && lat >= south && lat <= north
}

const bounds = states.features.map((state) => {
	const shape = state as unknown as GeoPermissibleObjects

	return { name: stateName(state), box: geoBounds(shape), shape }
})

/**
 * The state that holds each stop, in the order of `deliveryStops`. The atlas
 * gives the state, so no row of the data names it. The box test goes first,
 * because `geoContains` reads each vertex of a state.
 */
export const stopStates: (string | null)[] = deliveryStops.map(
	(stop) =>
		bounds.find((state) => withinBox(state.box, stop.at) && geoContains(state.shape, stop.at))
			?.name ?? null,
)
