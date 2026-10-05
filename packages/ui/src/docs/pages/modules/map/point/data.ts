import { type GeoPermissibleObjects, geoBounds, geoContains } from 'd3-geo'
import type { LngLat } from 'ui/map'
import { miles, stateName, states } from '../data.ts'

/**
 * The delivery stops of one day, in four rounds. Each round has a group of
 * stops near its depot. When the map shows the full country, each group shows
 * as one summary. When the map shows one state, the stops of that state show
 * apart.
 */
export const deliveryStops: { at: LngLat; label: string; detail: string }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas depot', detail: 'Origin' },
	{ at: [-96.7, 33.02], label: 'Plano', detail: '6 parcels' },
	{ at: [-97.11, 32.74], label: 'Arlington', detail: '9 parcels' },
	{ at: [-97.33, 32.76], label: 'Fort Worth', detail: '14 parcels' },
	{ at: [-97.13, 33.21], label: 'Denton', detail: '11 parcels' },
	{ at: [-97.15, 31.55], label: 'Waco', detail: '7 parcels' },
	{ at: [-97.74, 30.27], label: 'Austin', detail: '12 parcels' },
	{ at: [-98.49, 29.42], label: 'San Antonio', detail: '10 parcels' },
	{ at: [-95.37, 29.76], label: 'Houston', detail: '18 parcels' },
	{ at: [-106.49, 31.76], label: 'El Paso', detail: '4 parcels' },
	{ at: [-118.24, 34.05], label: 'Los Angeles depot', detail: 'Origin' },
	{ at: [-118.19, 33.77], label: 'Long Beach', detail: '8 parcels' },
	{ at: [-117.91, 33.84], label: 'Anaheim', detail: '5 parcels' },
	{ at: [-117.38, 33.95], label: 'Riverside', detail: '9 parcels' },
	{ at: [-117.16, 32.72], label: 'San Diego', detail: '13 parcels' },
	{ at: [-119.79, 36.74], label: 'Fresno', detail: '6 parcels' },
	{ at: [-122.42, 37.77], label: 'San Francisco', detail: '15 parcels' },
	{ at: [-121.49, 38.58], label: 'Sacramento', detail: '7 parcels' },
	{ at: [-87.63, 41.88], label: 'Chicago depot', detail: 'Origin' },
	{ at: [-88.15, 41.79], label: 'Naperville', detail: '5 parcels' },
	{ at: [-88.08, 41.53], label: 'Joliet', detail: '7 parcels' },
	{ at: [-89.09, 42.27], label: 'Rockford', detail: '4 parcels' },
	{ at: [-89.65, 39.8], label: 'Springfield', detail: '9 parcels' },
	{ at: [-84.39, 33.75], label: 'Atlanta depot', detail: 'Origin' },
	{ at: [-84.55, 33.95], label: 'Marietta', detail: '6 parcels' },
	{ at: [-83.63, 32.84], label: 'Macon', detail: '8 parcels' },
	{ at: [-81.1, 32.08], label: 'Savannah', detail: '11 parcels' },
]

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

/** The readout of a summary: the number of stops in it, and the distance across them. */
export function roundSummary(count: number, span: number): string {
	return `${count} stops · ${miles(span)} across`
}
