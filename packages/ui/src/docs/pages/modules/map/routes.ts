import type { LngLat } from 'ui/map'

/** The hub of a distribution network in Kansas City. The network is not real. */
export const hub: LngLat = [-94.58, 39.1]

/** The destinations of the network from {@link hub}. */
export const destinations: { abbreviation: string; at: LngLat }[] = [
	{ abbreviation: 'LA', at: [-118.24, 34.05] },
	{ abbreviation: 'SEA', at: [-122.33, 47.61] },
	{ abbreviation: 'NYC', at: [-74.0, 40.71] },
	{ abbreviation: 'ATL', at: [-84.39, 33.75] },
]

/** Two long-haul corridors, each between two cities. */
export const corridors: { abbreviation: string; start: LngLat; end: LngLat }[] = [
	{ abbreviation: 'SF→NY', start: [-122.42, 37.77], end: [-74.0, 40.71] },
	{ abbreviation: 'LA→JAX', start: [-118.24, 34.05], end: [-81.66, 30.33] },
]

/** The two ends of a line haul: Los Angeles and Chicago. */
export const lineHaul: { start: LngLat; end: LngLat } = {
	start: [-118.24, 34.05],
	end: [-87.63, 41.88],
}
