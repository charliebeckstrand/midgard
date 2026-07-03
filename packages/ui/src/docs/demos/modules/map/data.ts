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
	{ value: 'Eastern', color: 'sky' },
]

/** The M6, Catthorpe to Carlisle — hard-coded so the docs never call a routing server. */
export const m6: LngLat[] = [
	[-1.18, 52.4],
	[-1.46, 52.43],
	[-1.86, 52.51],
	[-1.95, 52.6],
	[-2.1, 52.81],
	[-2.24, 52.98],
	[-2.43, 53.09],
	[-2.58, 53.36],
	[-2.63, 53.55],
	[-2.72, 53.77],
	[-2.79, 54.05],
	[-2.75, 54.31],
	[-2.76, 54.66],
	[-2.93, 54.89],
]

/** The M1, London to Leeds. */
export const m1: LngLat[] = [
	[-0.13, 51.53],
	[-0.42, 51.88],
	[-0.76, 52.04],
	[-0.9, 52.24],
	[-1.13, 52.63],
	[-1.25, 52.95],
	[-1.32, 53.41],
	[-1.53, 53.79],
]

/** Warehouse markers for the points example. */
export const warehouses: { label: string; at: LngLat; detail: string }[] = [
	{ label: 'Salt Lake City', at: [-111.89, 40.76], detail: '14 loads' },
	{ label: 'Los Angeles', at: [-118.24, 34.05], detail: '32 loads' },
	{ label: 'Dallas', at: [-96.8, 32.78], detail: '18 loads' },
	{ label: 'Chicago', at: [-87.63, 41.88], detail: '27 loads' },
	{ label: 'Atlanta', at: [-84.39, 33.75], detail: '11 loads' },
]

/** A line haul with an intermediate waypoint for the markers example. */
export const lineHaul: LngLat[] = [
	[-118.24, 34.05],
	[-104.99, 39.74],
	[-87.63, 41.88],
]
