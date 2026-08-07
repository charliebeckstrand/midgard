import type { LngLat, MapCategory, MapSeriesColor } from '../../../../modules/map'

/** One row per state, keyed by the state's display name. */
export type StateZone = { state: string; zone: string }

/**
 * The contiguous states by primary timezone. Alaska and Hawaii are left
 * unmatched on purpose — they render in the neutral no-data fill, showing how
 * unmatched regions read.
 */
export const timezones: StateZone[] = [
	{ state: 'Washington', zone: 'Pacific' },
	{ state: 'Oregon', zone: 'Pacific' },
	{ state: 'California', zone: 'Pacific' },
	{ state: 'Nevada', zone: 'Pacific' },
	{ state: 'Montana', zone: 'Mountain' },
	{ state: 'Idaho', zone: 'Mountain' },
	{ state: 'Wyoming', zone: 'Mountain' },
	{ state: 'Utah', zone: 'Mountain' },
	{ state: 'Colorado', zone: 'Mountain' },
	{ state: 'Arizona', zone: 'Mountain' },
	{ state: 'New Mexico', zone: 'Mountain' },
	{ state: 'North Dakota', zone: 'Central' },
	{ state: 'South Dakota', zone: 'Central' },
	{ state: 'Nebraska', zone: 'Central' },
	{ state: 'Kansas', zone: 'Central' },
	{ state: 'Oklahoma', zone: 'Central' },
	{ state: 'Texas', zone: 'Central' },
	{ state: 'Minnesota', zone: 'Central' },
	{ state: 'Iowa', zone: 'Central' },
	{ state: 'Missouri', zone: 'Central' },
	{ state: 'Arkansas', zone: 'Central' },
	{ state: 'Louisiana', zone: 'Central' },
	{ state: 'Wisconsin', zone: 'Central' },
	{ state: 'Illinois', zone: 'Central' },
	{ state: 'Mississippi', zone: 'Central' },
	{ state: 'Alabama', zone: 'Central' },
	{ state: 'Tennessee', zone: 'Central' },
	{ state: 'Michigan', zone: 'Eastern' },
	{ state: 'Indiana', zone: 'Eastern' },
	{ state: 'Ohio', zone: 'Eastern' },
	{ state: 'Kentucky', zone: 'Eastern' },
	{ state: 'Florida', zone: 'Eastern' },
	{ state: 'Georgia', zone: 'Eastern' },
	{ state: 'South Carolina', zone: 'Eastern' },
	{ state: 'North Carolina', zone: 'Eastern' },
	{ state: 'Virginia', zone: 'Eastern' },
	{ state: 'West Virginia', zone: 'Eastern' },
	{ state: 'Maryland', zone: 'Eastern' },
	{ state: 'Delaware', zone: 'Eastern' },
	{ state: 'New Jersey', zone: 'Eastern' },
	{ state: 'Pennsylvania', zone: 'Eastern' },
	{ state: 'New York', zone: 'Eastern' },
	{ state: 'Connecticut', zone: 'Eastern' },
	{ state: 'Rhode Island', zone: 'Eastern' },
	{ state: 'Massachusetts', zone: 'Eastern' },
	{ state: 'Vermont', zone: 'Eastern' },
	{ state: 'New Hampshire', zone: 'Eastern' },
	{ state: 'Maine', zone: 'Eastern' },
]

/** Explicit order and colours, so the legend reads west → east. */
export const zoneCategories: MapCategory[] = [
	{ value: 'Pacific', color: 'blue' },
	{ value: 'Mountain', color: 'orange' },
	{ value: 'Central', color: 'green' },
	{ value: 'Eastern', color: 'red' },
]

/** Warehouse markers for the points example. */
export const warehouses: { city: string; abbreviation: string; at: LngLat; detail: string }[] = [
	{ city: 'Salt Lake City', abbreviation: 'SLC', at: [-111.89, 40.76], detail: '14 loads' },
	{ city: 'Los Angeles', abbreviation: 'LA', at: [-118.24, 34.05], detail: '32 loads' },
	{ city: 'Dallas', abbreviation: 'DAL', at: [-96.8, 32.78], detail: '18 loads' },
	{ city: 'Chicago', abbreviation: 'CHI', at: [-87.63, 41.88], detail: '27 loads' },
	{ city: 'Atlanta', abbreviation: 'ATL', at: [-84.39, 33.75], detail: '11 loads' },
]

/**
 * One day's delivery stops across four state rounds, for the plural-point
 * example. Enough of them that a `MapPoint` each would claim a legend row each
 * and exhaust the eight-slot palette — which is the case `MapPoints` exists
 * for — and clustered around each round's depot, so a national frame draws each
 * bunch as one graded summary while a frame fitted to one state draws its own
 * stops apart.
 *
 * No row names its state: the example reads that off the atlas with
 * `geoContains`, so the picker beside the map offers exactly the states that
 * hold a stop.
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

// The routed examples below carry only origin and destination coordinates.
// The demo fetches the road route between them from the OSRM demo server at
// render time (see `useRoute` in index.tsx), so the line follows the streets
// and the mileage is real — the geocode → route → draw flow a consumer runs.

/** Two long-haul corridors the routes example draws as line-only routes. */
export const corridors: { city: string; abbreviation: string; start: LngLat; end: LngLat }[] = [
	{
		city: 'San Francisco → New York',
		abbreviation: 'SF→NY',
		start: [-122.42, 37.77],
		end: [-74.0, 40.71],
	},
	{
		city: 'Los Angeles → Jacksonville',
		abbreviation: 'LA→JAX',
		start: [-118.24, 34.05],
		end: [-81.66, 30.33],
	},
]

/** The origin → destination pair the marker and animation examples route. */
export const laToChicago: { start: LngLat; end: LngLat } = {
	start: [-118.24, 34.05],
	end: [-87.63, 41.88],
}

/** The IKEA network's shared origin — a central Kansas City distribution hub. */
export const ikeaHub: LngLat = [-94.58, 39.1]

/**
 * A made-up IKEA distribution network: delivery destinations reached from
 * {@link ikeaHub}. The demo routes each hub → destination run on real roads
 * and labels it with the fetched mileage.
 */
export const ikeaDestinations: { city: string; abbreviation: string; at: LngLat }[] = [
	{ city: 'Los Angeles', abbreviation: 'LA', at: [-118.24, 34.05] },
	{ city: 'Seattle', abbreviation: 'SEA', at: [-122.33, 47.61] },
	{ city: 'New York', abbreviation: 'NYC', at: [-74.0, 40.71] },
	{ city: 'Atlanta', abbreviation: 'ATL', at: [-84.39, 33.75] },
]

/**
 * Depot catchments for the geofence example: a next-day service radius around
 * each of three warehouses, as a distance across the ground in metres. The radii
 * differ by depot, so the circles read as data rather than as chrome, and each
 * carries its own slot colour so a zone and the marks inside it read as a pair.
 */
export const serviceAreas: {
	city: string
	at: LngLat
	radius: number
	color: MapSeriesColor
	detail: string
}[] = [
	{ city: 'Dallas', at: [-96.8, 32.78], radius: 240_000, color: 'blue', detail: 'Next day' },
	{ city: 'Chicago', at: [-87.63, 41.88], radius: 190_000, color: 'violet', detail: 'Next day' },
	{
		city: 'Los Angeles',
		at: [-118.24, 34.05],
		radius: 150_000,
		color: 'amber',
		detail: 'Same day',
	},
]

/**
 * The Texas Triangle as a drawn zone: the metro corridor running Dallas →
 * Houston → San Antonio → Austin. A polygon geofence takes its own ring, so a
 * territory that follows no radius — a district, a franchise area, a tariff
 * band — draws exactly as its boundary states.
 */
export const texasTriangle: LngLat[] = [
	[-96.8, 32.78],
	[-95.37, 29.76],
	[-98.49, 29.42],
	[-97.74, 30.27],
]

/** The four metros the {@link texasTriangle} corridor holds, drawn inside it. */
export const texasMetros: { at: LngLat; label: string; detail: string }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas', detail: '18 loads' },
	{ at: [-95.37, 29.76], label: 'Houston', detail: '22 loads' },
	{ at: [-98.49, 29.42], label: 'San Antonio', detail: '9 loads' },
	{ at: [-97.74, 30.27], label: 'Austin', detail: '12 loads' },
]
