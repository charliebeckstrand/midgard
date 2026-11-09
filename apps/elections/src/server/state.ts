import type { Contest } from '../elections/registry'
import type { UsState } from '../elections/us-states'
import type { CountyResult } from '../types'
import { newestUpdate, partyCounties, type RaceEntry } from '../utilities/results'
import { race } from './races'
import type { ContestResult } from './results'

/** One office of an election in one state: its races, and the counties of its map. */
export type StateOffice = {
	contest: Contest
	/** The races of the office in the state, such as the districts of the House. */
	entries: RaceEntry[]
	/**
	 * The counties of the map of the office. One race gives its own counties.
	 * Many races, such as the districts of the House, give the votes of each
	 * party in each county, added over the races.
	 */
	counties: CountyResult[]
	/** The newest update of the races, as an ISO time, or `null` for none. */
	updated: string | null
}

/**
 * The offices of an election in a state, in the order of the registry, each
 * with its races and the counties of its map. An office with no race in the
 * state is left out. Each race of the state is read for its counties, and the
 * cache of each race holds it (see `race`).
 */
export async function stateOffices(
	results: readonly ContestResult[],
	state: UsState,
): Promise<StateOffice[]> {
	const offices = await Promise.all(
		results.map(async ({ contest, entries }): Promise<StateOffice> => {
			const own = entries.filter((entry) => entry.state.key === state.key)

			const races = await Promise.all(own.map((entry) => race(entry.raceId)))

			const [only] = races

			return {
				contest,
				entries: own,
				counties:
					races.length === 1 && only !== undefined
						? only.counties
						: partyCounties(races.map((read) => read.counties)),
				updated: newestUpdate(races),
			}
		}),
	)

	return offices.filter((office) => office.entries.length > 0)
}
