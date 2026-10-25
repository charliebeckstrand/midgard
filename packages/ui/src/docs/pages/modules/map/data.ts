import { feature } from 'topojson-client'
import type { MapCategory, MapFeature, MapFeatureCollection } from 'ui/map'
import type { IntlShape } from 'ui/primitives/intl'
import statesAtlas from 'us-atlas/states-10m.json'
import { stateLabel } from '../../../data/us-states.ts'
import { words } from '../../../data/words.ts'

type Topology = Parameters<typeof feature>[0]

/**
 * The states of `us-atlas` as one feature collection. The atlas is a file in
 * the package, so the map draws with no request, also in the prerender.
 */
export const states = feature(
	statesAtlas as unknown as Topology,
	'states',
) as unknown as MapFeatureCollection

/** A distance in whole miles in the number format of the locale, such as `1,642 mi`. */
export function miles(meters: number, intl: IntlShape): string {
	return intl.formatNumber(meters / 1609.344, {
		style: 'unit',
		unit: 'mile',
		maximumFractionDigits: 0,
	})
}

/** The name of a state. The timezone rows use it as the identity of a region. */
export function stateName(state: MapFeature): string {
	return String(state.properties?.name)
}

/** The name of each state in the language of the page, by the name of the atlas. */
const labels = new Map(states.features.map((state) => [stateName(state), stateLabel(state)]))

/** The name of a state in the language of the page, from the name of the atlas. */
export function labelOfState(name: string): string {
	return labels.get(name) ?? name
}

/**
 * The geometry of one state, or all the states when `name` is `null`. The map
 * fits its projection to the geography that it gets, so one state fills the
 * frame.
 */
export function stateFrame(name: string | null): MapFeatureCollection {
	const state =
		name === null ? undefined : states.features.find((candidate) => stateName(candidate) === name)

	return state === undefined ? states : { type: 'FeatureCollection', features: [state] }
}

/**
 * The US time zones, from west to east. A row holds the word, because the map
 * compares the zone of a row with the value of a category.
 */
const zones = words('time-zone', {
	pacific: 'Pacific',
	mountain: 'Mountain',
	central: 'Central',
	eastern: 'Eastern',
})

/** One row for each state, keyed by the name of the state. */
export type StateZone = { state: string; zone: string }

/**
 * The contiguous states by primary timezone. Alaska, Hawaii, and the District of
 * Columbia have no row, so they show in the fill for no data.
 */
export const timezones: StateZone[] = [
	{ state: 'Washington', zone: zones.pacific },
	{ state: 'Oregon', zone: zones.pacific },
	{ state: 'California', zone: zones.pacific },
	{ state: 'Nevada', zone: zones.pacific },
	{ state: 'Montana', zone: zones.mountain },
	{ state: 'Idaho', zone: zones.mountain },
	{ state: 'Wyoming', zone: zones.mountain },
	{ state: 'Utah', zone: zones.mountain },
	{ state: 'Colorado', zone: zones.mountain },
	{ state: 'Arizona', zone: zones.mountain },
	{ state: 'New Mexico', zone: zones.mountain },
	{ state: 'North Dakota', zone: zones.central },
	{ state: 'South Dakota', zone: zones.central },
	{ state: 'Nebraska', zone: zones.central },
	{ state: 'Kansas', zone: zones.central },
	{ state: 'Oklahoma', zone: zones.central },
	{ state: 'Texas', zone: zones.central },
	{ state: 'Minnesota', zone: zones.central },
	{ state: 'Iowa', zone: zones.central },
	{ state: 'Missouri', zone: zones.central },
	{ state: 'Arkansas', zone: zones.central },
	{ state: 'Louisiana', zone: zones.central },
	{ state: 'Wisconsin', zone: zones.central },
	{ state: 'Illinois', zone: zones.central },
	{ state: 'Mississippi', zone: zones.central },
	{ state: 'Alabama', zone: zones.central },
	{ state: 'Tennessee', zone: zones.central },
	{ state: 'Michigan', zone: zones.eastern },
	{ state: 'Indiana', zone: zones.eastern },
	{ state: 'Ohio', zone: zones.eastern },
	{ state: 'Kentucky', zone: zones.eastern },
	{ state: 'Florida', zone: zones.eastern },
	{ state: 'Georgia', zone: zones.eastern },
	{ state: 'South Carolina', zone: zones.eastern },
	{ state: 'North Carolina', zone: zones.eastern },
	{ state: 'Virginia', zone: zones.eastern },
	{ state: 'West Virginia', zone: zones.eastern },
	{ state: 'Maryland', zone: zones.eastern },
	{ state: 'Delaware', zone: zones.eastern },
	{ state: 'New Jersey', zone: zones.eastern },
	{ state: 'Pennsylvania', zone: zones.eastern },
	{ state: 'New York', zone: zones.eastern },
	{ state: 'Connecticut', zone: zones.eastern },
	{ state: 'Rhode Island', zone: zones.eastern },
	{ state: 'Massachusetts', zone: zones.eastern },
	{ state: 'Vermont', zone: zones.eastern },
	{ state: 'New Hampshire', zone: zones.eastern },
	{ state: 'Maine', zone: zones.eastern },
]

/** The order and the colors of the zones, so that the legend reads from west to east. */
export const zoneCategories: MapCategory[] = [
	{ value: zones.pacific, color: 'blue' },
	{ value: zones.mountain, color: 'orange' },
	{ value: zones.central, color: 'green' },
	{ value: zones.eastern, color: 'red' },
]
