import { feature } from 'topojson-client'
import type { MapFeatureCollection } from 'ui/map'

type Topology = Parameters<typeof feature>[0]

/** The counties of each state, by the two-digit FIPS code at the start of each county id. */
export type CountiesByState = ReadonlyMap<string, MapFeatureCollection>

let counties: Promise<CountiesByState> | undefined

/**
 * Loads the county atlas of `us-atlas` and cuts it into one collection for
 * each state. The atlas is a file in the package. It loads as a module on the
 * first call, and each later call gets the same result. Thus a state gives the
 * same collection each time, and the map keeps its fit for it.
 */
export function loadCounties(): Promise<CountiesByState> {
	counties ??= import('us-atlas/counties-10m.json').then(({ default: atlas }) => {
		const all = feature(atlas as unknown as Topology, 'counties') as unknown as MapFeatureCollection

		const groups = new Map<string, MapFeatureCollection>()

		for (const county of all.features) {
			const state = String(county.id).slice(0, 2)

			const held = groups.get(state)

			if (held === undefined) groups.set(state, { type: 'FeatureCollection', features: [county] })
			else held.features.push(county)
		}

		return groups
	})

	return counties
}
