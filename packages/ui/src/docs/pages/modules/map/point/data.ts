import { type GeoPermissibleObjects, geoBounds, geoContains } from 'd3-geo'
import type { LngLat } from 'ui/map'
import { stateName, states } from '../data.ts'

/**
 * The delivery stops of one day, in four rounds. Each round has a group of
 * stops near its depot. When the map shows the full country, each group shows
 * as one summary. When the map shows one state, the stops of that state show
 * apart.
 */
const stops: { at: LngLat; label: string; parcels?: number }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas depot' },
	{ at: [-96.7, 33.02], label: 'Plano', parcels: 6 },
	{ at: [-97.11, 32.74], label: 'Arlington', parcels: 9 },
	{ at: [-97.33, 32.76], label: 'Fort Worth', parcels: 14 },
	{ at: [-97.13, 33.21], label: 'Denton', parcels: 11 },
	{ at: [-97.15, 31.55], label: 'Waco', parcels: 7 },
	{ at: [-97.74, 30.27], label: 'Austin', parcels: 12 },
	{ at: [-98.49, 29.42], label: 'San Antonio', parcels: 10 },
	{ at: [-95.37, 29.76], label: 'Houston', parcels: 18 },
	{ at: [-106.49, 31.76], label: 'El Paso', parcels: 4 },
	{ at: [-118.24, 34.05], label: 'Los Angeles depot' },
	{ at: [-118.19, 33.77], label: 'Long Beach', parcels: 8 },
	{ at: [-117.91, 33.84], label: 'Anaheim', parcels: 5 },
	{ at: [-117.38, 33.95], label: 'Riverside', parcels: 9 },
	{ at: [-117.16, 32.72], label: 'San Diego', parcels: 13 },
	{ at: [-119.79, 36.74], label: 'Fresno', parcels: 6 },
	{ at: [-122.42, 37.77], label: 'San Francisco', parcels: 15 },
	{ at: [-121.49, 38.58], label: 'Sacramento', parcels: 7 },
	{ at: [-87.63, 41.88], label: 'Chicago depot' },
	{ at: [-88.15, 41.79], label: 'Naperville', parcels: 5 },
	{ at: [-88.08, 41.53], label: 'Joliet', parcels: 7 },
	{ at: [-89.09, 42.27], label: 'Rockford', parcels: 4 },
	{ at: [-89.65, 39.8], label: 'Springfield', parcels: 9 },
	{ at: [-84.39, 33.75], label: 'Atlanta depot' },
	{ at: [-84.55, 33.95], label: 'Marietta', parcels: 6 },
	{ at: [-83.63, 32.84], label: 'Macon', parcels: 8 },
	{ at: [-81.1, 32.08], label: 'Savannah', parcels: 11 },
]

/** Each stop with its readout. A depot has no parcels, and its readout is "Origin". */
export const deliveryStops = stops.map((stop) => ({
	...stop,
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
