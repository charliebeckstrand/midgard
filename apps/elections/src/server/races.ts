import { cacheLife } from 'next/cache'
import type { Candidate, NationalRace, Race } from '../types'
import { isCalled } from '../utilities/race-math'
import { findStateByKey } from '../utilities/us-states'
import { fetchCivicRace } from './civic'
import { readNationalRace, readRace } from './civic-race'
import { atlasCountyNames } from './county-names'

/**
 * Sets the cache life of a read from the count of its races. A count that goes
 * on, or a race that has no winner, reads again each minute. Races that are
 * fully in and called hold for hours.
 */
function countLife(
	races: readonly { reporting: number; candidates: readonly Candidate[] }[],
): void {
	const counting = races.some((race) => race.reporting < 100 || !isCalled(race.candidates))

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
export async function getNationalRace(id: number): Promise<NationalRace> {
	'use cache'

	const race = readNationalRace(id, await fetchCivicRace(id))

	countLife(race.regions)

	return race
}

/** One race of a state or a district, with its counties. */
export async function getRace(id: number): Promise<Race> {
	'use cache'

	const raw = await fetchCivicRace(id)

	const province = (raw as { province?: unknown } | null)?.province

	const state = typeof province === 'string' ? findStateByKey(province.toLowerCase()) : undefined

	if (state === undefined) throw new Error(`Race ${id} names no state of the US.`)

	const parsed = readRace(id, raw, state.fips, atlasCountyNames)

	countLife([parsed])

	return parsed
}
