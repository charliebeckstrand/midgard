import { connection } from 'next/server'
import { type Seed, seed } from 'shared/queries'
import type { Election } from '../elections/registry'
import type { Race } from '../types'
import { readDrawerStep } from '../utilities/elections-url'
import { type OfficeRaces, stepEntry } from '../utilities/results'
import { race } from './races'

/** The search params of a page, as Next gives them. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The race of the step of the Drawer that the address names, read on the
 * server, so a reload paints the Drawer whole. `null` for a closed Drawer, or a
 * step that shows no one race.
 */
export async function drawerSeed(
	election: Election,
	results: readonly OfficeRaces[],
	searchParams: SearchParams,
): Promise<Seed<Race> | null> {
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

	return seed(read)
}

/** The races of each office, without the national race, which the Drawer does not read. */
export function officeRaces(results: readonly OfficeRaces[]): OfficeRaces[] {
	return results.map(({ contest, entries }) => ({ contest, entries }))
}
