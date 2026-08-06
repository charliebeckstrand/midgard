import type { LngLat, MapCategory } from '../../../../modules/map'

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
 * One day's delivery stops out of the Dallas warehouse, for the plural-point
 * example. Enough of them that a `MapPoint` each would claim a legend row each
 * and exhaust the eight-slot palette — which is the case `MapPoints` exists for.
 */
export const deliveryStops: { at: LngLat; label: string; detail: string }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas depot', detail: 'Origin' },
	{ at: [-96.67, 33.02], label: 'Plano', detail: '6 parcels' },
	{ at: [-97.14, 32.75], label: 'Arlington', detail: '9 parcels' },
	{ at: [-97.33, 32.76], label: 'Fort Worth', detail: '14 parcels' },
	{ at: [-96.61, 32.9], label: 'Garland', detail: '4 parcels' },
	{ at: [-96.99, 32.61], label: 'Cedar Hill', detail: '7 parcels' },
	{ at: [-96.45, 32.75], label: 'Mesquite', detail: '5 parcels' },
	{ at: [-97.07, 33.15], label: 'Denton', detail: '11 parcels' },
	{ at: [-96.55, 33.19], label: 'McKinney', detail: '8 parcels' },
	{ at: [-97.19, 32.99], label: 'Grapevine', detail: '3 parcels' },
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
