import type { NationalRace } from '../types'
import type { ElectionRaces } from '../utilities/race-search'
import { type Contest, ELECTIONS, type Election } from '../utilities/registry'
import { type RaceCall, type RaceEntry, readEntries } from '../utilities/results'
import { getNationalRace, getRace } from './races'

/** The results of one contest: its national race and the race of each region. */
export type ContestResult = {
	contest: Contest
	national: NationalRace
	entries: RaceEntry[]
}

/** The results of one contest of an election. */
export async function getContestResult(contest: Contest): Promise<ContestResult> {
	const national = await getNationalRace(contest.aggregate)

	return { contest, national, entries: readEntries(contest, national) }
}

/** The results of every contest of an election, in the order of the registry. */
export function getElectionResults(election: Election): Promise<ContestResult[]> {
	return Promise.all(election.contests.map(getContestResult))
}

/**
 * Whether a race id is a race of an election of the registry that has results.
 * The route of a race asks it, so the route reads no race that the app does not show.
 */
export async function isKnownRace(id: number): Promise<boolean> {
	const counted = ELECTIONS.filter((election) => election.status !== 'upcoming')

	const results = await Promise.all(counted.map(getElectionResults))

	return results.flat().some((result) => result.entries.some((entry) => entry.raceId === id))
}

/**
 * The newest calls of the statewide races, newest first. The national races
 * mark a winner but give no call time, so each called race is read for it. A
 * race without `called_at` is left out: its last update moves with each count,
 * so it does not tell when the race was called.
 *
 * @param results - The results of the contests of the election.
 * @param count - The most calls to give.
 */
export async function getLatestCalls(
	results: readonly ContestResult[],
	count: number,
): Promise<RaceCall[]> {
	const called = results
		.filter((result) => result.contest.depth === 'state')
		.flatMap((result) => result.entries)
		.filter((entry) => entry.called)

	const calls = await Promise.all(
		called.map(async (entry): Promise<RaceCall | null> => {
			const read = await getRace(entry.raceId)

			const winner = read.candidates.find((candidate) => candidate.winner)

			if (winner === undefined || read.calledAt === null) return null

			return { entry, winner, at: read.calledAt }
		}),
	)

	return calls
		.filter((call): call is RaceCall => call !== null)
		.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
		.slice(0, count)
}

/**
 * The races of each office of each election, for the search of every
 * election. An election to come has no results, so it has no races.
 */
export function getSearchedElections(elections: readonly Election[]): Promise<ElectionRaces[]> {
	return Promise.all(
		elections.map(async (election) => ({
			election,
			races:
				election.status === 'upcoming'
					? []
					: (await getElectionResults(election)).map(({ contest, entries }) => ({
							contest,
							entries,
						})),
		})),
	)
}
