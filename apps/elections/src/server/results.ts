import type { Contest, Election } from '../elections/registry'
import type { Candidate, NationalRace } from '../types'
import { type RaceEntry, readEntries } from '../utilities/results'
import { nationalRace, race } from './races'

/** The results of one contest: its national race and the race of each region. */
export type ContestResult = {
	contest: Contest
	national: NationalRace
	entries: RaceEntry[]
}

/** The results of one contest of an election. */
export async function contestResult(contest: Contest): Promise<ContestResult> {
	const national = await nationalRace(contest.aggregate)

	return { contest, national, entries: readEntries(contest, national) }
}

/** The results of every contest of an election, in the order of the registry. */
export function electionResults(election: Election): Promise<ContestResult[]> {
	return Promise.all(election.contests.map(contestResult))
}

/** One call of a race: the race, its winner, and when civicAPI called it. */
export type RaceCall = {
	entry: RaceEntry
	winner: Candidate
	/** When civicAPI called the race, or its last update where it gives no call time. */
	at: string
}

/**
 * The newest calls of the statewide races, newest first. The national races
 * mark a winner but give no call time, so each called race is read for it. A
 * race without `called_at` takes its last update.
 *
 * @param results - The results of the contests of the election.
 * @param count - The most calls to give.
 */
export async function latestCalls(
	results: readonly ContestResult[],
	count: number,
): Promise<RaceCall[]> {
	const called = results
		.filter((result) => result.contest.depth === 'state')
		.flatMap((result) => result.entries)
		.filter((entry) => entry.called)

	const calls = await Promise.all(
		called.map(async (entry): Promise<RaceCall | null> => {
			const read = await race(entry.raceId)

			const winner = read.candidates.find((candidate) => candidate.winner)

			return winner === undefined ? null : { entry, winner, at: read.calledAt ?? read.updated }
		}),
	)

	return calls
		.filter((call): call is RaceCall => call !== null)
		.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
		.slice(0, count)
}
