import { connection } from 'next/server'
import { seed } from 'shared/queries'
import type { MapFeatureCollection } from 'ui/map'
import type { DrawerSeed } from '../components/election-drawer'
import { CountyMap } from '../components/race-detail/county-map'
import type { Election } from '../elections/registry'
import { readDrawerStep } from '../utilities/elections-url'
import { type OfficeRaces, stepEntry } from '../utilities/results'
import { countyShapes } from './county-shapes'
import { race } from './races'

/** The search params of a page, as Next gives them. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The race of the step of the Drawer that the address names, read on the
 * server, so a reload paints the Drawer whole. `null` for a closed Drawer, or a
 * step that shows no one race. A step on the map of the race also takes the
 * county shapes of its state and the county map, so the first paint and
 * hydration draw the map.
 */
export async function drawerSeed(
	election: Election,
	results: readonly OfficeRaces[],
	searchParams: SearchParams,
): Promise<DrawerSeed | null> {
	const search = await searchParams

	const step = readDrawerStep(election, {
		get: (name) => {
			const value = search[name]

			return (Array.isArray(value) ? value[0] : value) ?? null
		},
	})

	const entry = step === null ? undefined : stepEntry(results, step)

	if (entry === undefined) return null

	const read = await race(entry.raceId)

	// The seed marks the time of the read, which belongs to the request, not to a prerender.
	await connection()

	const onMap = step?.view === 'counties' && step.county === null

	return {
		race: seed(read),
		map: onMap
			? {
					shapes: JSON.parse(countyShapes(entry.state.fips)) as MapFeatureCollection,
					// A client reference: the page sends the chunk of the map with the Drawer.
					CountyMap,
				}
			: null,
	}
}

/** The races of each office, without the national race, which the Drawer does not read. */
export function officeRaces(results: readonly OfficeRaces[]): OfficeRaces[] {
	return results.map(({ contest, entries }) => ({ contest, entries }))
}
