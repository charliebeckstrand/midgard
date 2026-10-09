import { feature } from 'topojson-client'
import type { MapCategory, MapFeature, MapFeatureCollection } from 'ui/map'
import statesAtlas from 'us-atlas/states-10m.json'

type Topology = Parameters<typeof feature>[0]

/**
 * The states of `us-atlas` as one feature collection. The atlas is a file in
 * the package, so the map draws with no request, also in the prerender.
 */
export const states = feature(
	statesAtlas as unknown as Topology,
	'states',
) as unknown as MapFeatureCollection

/** A distance in whole miles, such as `1,642 mi`. */
export function miles(meters: number): string {
	return `${Math.round(meters / 1609.344).toLocaleString('en-US')} mi`
}

/** The name of a state. The timezone rows use it as the identity of a region. */
export function stateName(state: MapFeature): string {
	return String(state.properties?.name)
}

/**
 * The geometry of one state, or all the states when `name` is `null`. The map
 * fits its projection to the geography that it gets, so one state fills the
 * frame.
 */
export function stateFrame(name: string | null): MapFeatureCollection {
	const held = name === null ? undefined : states.features.find((s) => stateName(s) === name)

	return held === undefined ? states : { type: 'FeatureCollection', features: [held] }
}

/** One row for each state, keyed by the name of the state. */
export type StateZone = { state: string; zone: string }

/**
 * The contiguous states by primary timezone. Alaska, Hawaii, and the District of
 * Columbia have no row, so they show in the fill for no data.
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

/** The order and the colors of the zones, so that the legend reads from west to east. */
export const zoneCategories: MapCategory[] = [
	{ value: 'Pacific', color: 'blue' },
	{ value: 'Mountain', color: 'orange' },
	{ value: 'Central', color: 'green' },
	{ value: 'Eastern', color: 'red' },
]
