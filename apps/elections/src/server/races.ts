import { cacheLife } from 'next/cache'
import { stateOfKey } from '../elections/us-states'
import type { Candidate, NationalRace, Race } from '../types'
import { isCalled } from '../utilities/race-math'
import { fetchRace } from './civic'
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

/** A read of the cache of a race: the parsed race, or the message of a failure of civicAPI. */
type Read<T> = { ok: true; value: T } | { ok: false; message: string }

/**
 * Keeps a failure of civicAPI in the cache for one minute at most.
 *
 * @remarks
 * A prerender leaves out an entry with this short life, so a page that reads
 * the race prerenders without it and reads it on a request. Thus the build
 * does not fail while civicAPI is down, and the static shell keeps no failure.
 * A failure that throws in the cache fails the build, also when a caller
 * catches it.
 */
function failed(message: string): Read<never> {
	cacheLife('seconds')

	return { ok: false, message }
}

/** Gives the race of a read, or throws its failure, which the error boundary of the page shows. */
async function unwrap<T>(read: Promise<Read<T>>): Promise<T> {
	const result = await read

	if (!result.ok) throw new Error(result.message)

	return result.value
}

/**
 * A national race, such as every Senate race and the seats of each party.
 *
 * @remarks
 * The cache keeps the parsed race, not the answer, which is large for the
 * House. Each refresh reads the cache, so a hundred readers cost one upstream
 * read a minute.
 */
export function nationalRace(id: number): Promise<NationalRace> {
	return unwrap(cachedNationalRace(id))
}

/** One race of a state or a district, with its counties. */
export function race(id: number): Promise<Race> {
	return unwrap(cachedRace(id))
}

async function cachedNationalRace(id: number): Promise<Read<NationalRace>> {
	'use cache'

	const read = await fetchRace(id)

	if (!read.ok) return failed(read.message)

	const race = readNationalRace(id, read.raw)

	countLife(race.regions)

	return { ok: true, value: race }
}

async function cachedRace(id: number): Promise<Read<Race>> {
	'use cache'

	const read = await fetchRace(id)

	if (!read.ok) return failed(read.message)

	const raw = read.raw

	const province = (raw as { province?: unknown } | null)?.province

	const state = typeof province === 'string' ? stateOfKey(province.toLowerCase()) : undefined

	if (state === undefined) throw new Error(`Race ${id} names no state of the US.`)

	const parsed = readRace(id, raw, state.fips, atlasCountyNames)

	countLife([parsed])

	return { ok: true, value: parsed }
}
