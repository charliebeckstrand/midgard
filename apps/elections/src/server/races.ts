import { cacheLife } from 'next/cache'
import { stateOfKey } from '../elections/us-states'
import type { NationalRace, Race } from '../types'
import { fetchRace } from './civic'
import { readNationalRace, readRace } from './civic-race'
import { atlasCountyNames } from './county-names'

/**
 * Sets the cache life of a read from its count. A count that goes on, or a race
 * that has no winner, reads again each minute. A race that is fully in and
 * called holds for hours.
 */
function countLife(counting: boolean): void {
	cacheLife(counting ? 'minutes' : 'hours')
}

/**
 * A national race, such as every Senate race and the seats of each party.
 *
 * @remarks
 * The cache keeps the parsed race, not the answer, which is large for the
 * House. Each refresh reads the cache, so a hundred readers cost one upstream
 * read a minute.
 */
export async function nationalRace(id: number): Promise<NationalRace> {
	'use cache'

	const race = readNationalRace(id, await fetchRace(id))

	countLife(
		race.regions.some(
			(region) => region.reporting < 100 || !region.candidates.some((c) => c.winner),
		),
	)

	return race
}

/** One race of a state or a district, with its counties. */
export async function race(id: number): Promise<Race> {
	'use cache'

	const raw = await fetchRace(id)

	const province = (raw as { province?: unknown } | null)?.province

	const state = typeof province === 'string' ? stateOfKey(province.toLowerCase()) : undefined

	if (state === undefined) throw new Error(`Race ${id} names no state of the US.`)

	const parsed = readRace(id, raw, state.fips, atlasCountyNames)

	countLife(parsed.reporting < 100 || !parsed.candidates.some((candidate) => candidate.winner))

	return parsed
}
