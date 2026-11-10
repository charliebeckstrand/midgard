import { type Election, electionPath } from '../elections/registry'
import type { UsState } from '../elections/us-states'
import type { PartySlot } from '../types'
import { type DrawerStep, drawerHref } from './elections-url'
import { entryKey, entryName, entryStep, matchesWords, type OfficeRaces } from './results'

/**
 * The search of an election, in the header of each of its pages. A row is a
 * state or a race, and a pick opens the Drawer on it.
 *
 * The search of every election, in the header of each level page,
 * holds the rows of each election too, and a row of each election. A pick
 * opens the page of the election, with the Drawer on the state or the race.
 */

/** One row of the search: a state or a race, and the step of the Drawer that it opens. */
export type SearchRow = {
	/** A key that is unique in the search, such as `state:ga` or `house:ga-06`. */
	key: string
	/** The name of the state or the race, such as `Georgia` or `Georgia 6th District`. */
	label: string
	/** The offices of a state, or the two leaders of a race. */
	description: string
	/** The color of the leader of a race, or `null` for a state. */
	slot: PartySlot | null
	step: DrawerStep
}

/** One group of the search: a heading, and the rows under it. */
export type SearchGroup = { heading: string; rows: SearchRow[] }

/** The most rows of a group that show for a query. */
export const SEARCH_LIMIT = 8

/** The states with a race of any office, by name, each with the labels of its offices. */
function stateOffices(races: readonly OfficeRaces[]): { state: UsState; offices: string[] }[] {
	const byKey = new Map<string, { state: UsState; offices: string[] }>()

	for (const { contest, entries } of races) {
		for (const { state } of entries) {
			const held = byKey.get(state.key) ?? { state, offices: [] }

			if (!held.offices.includes(contest.label)) held.offices.push(contest.label)

			byKey.set(state.key, held)
		}
	}

	return [...byKey.values()].sort((a, b) => a.state.name.localeCompare(b.state.name))
}

/**
 * The groups of the search for a query: the states, then the races of each
 * office in the order of the registry. A group with no match is left out.
 *
 * A state matches by its name. A race matches as in the search of the Drawer
 * (`matchesSearch`), and by its office too, so `georgia senate` finds the race.
 * An empty query gives no group, so the search opens on the search field
 * alone. A query gives at most {@link SEARCH_LIMIT} rows of each group.
 */
export function searchGroups(races: readonly OfficeRaces[], query: string): SearchGroup[] {
	if (query.trim() === '') return []

	const states: SearchRow[] = stateOffices(races)
		.filter(({ state }) => matchesWords([state.name], query))
		.slice(0, SEARCH_LIMIT)
		.map(({ state, offices }) => ({
			key: `state:${state.key}`,
			label: state.name,
			description: offices.join(', '),
			slot: null,
			step: { region: state, office: null, district: null, county: null },
		}))

	const groups: SearchGroup[] = [{ heading: 'States', rows: states }]

	for (const { contest, entries } of races) {
		const rows = entries
			.filter((entry) =>
				matchesWords(
					[contest.label, entryName(entry), ...entry.candidates.map((candidate) => candidate.name)],
					query,
				),
			)
			.slice(0, SEARCH_LIMIT)
			.map((entry) => ({
				key: entryKey(entry),
				label: entryName(entry),
				description: entry.candidates
					.slice(0, 2)
					.map((candidate) => candidate.name)
					.join(', '),
				slot: entry.candidates[0]?.slot ?? null,
				step: entryStep(entry),
			}))

		groups.push({ heading: contest.label, rows })
	}

	return groups.filter((group) => group.rows.length > 0)
}

/** The races of each office of one election, for the search of every election. */
export type ElectionRaces = {
	election: Election
	/** The races of each office, or none for an election with no results, such as one to come. */
	races: readonly OfficeRaces[]
}

/** One row of the search of every election: an election, a state, or a race, and the address of its page. */
export type LinkRow = Omit<SearchRow, 'step'> & { href: string }

/** One group of the search of every election. */
export type LinkGroup = { heading: string; rows: LinkRow[] }

/**
 * The groups of the search of every election for a query: the elections, then
 * the groups of the search of each election (`searchGroups`). A group with no
 * match is left out.
 *
 * An election matches by its year, its name, and its country. An empty query
 * gives only the elections, so the search opens on the list of the elections.
 * The heading of each group of an election names the election, such as
 * `Senate, 2026 Midterms`, because a pick leaves the list for the page of
 * that election.
 */
export function electionsSearchGroups(
	elections: readonly ElectionRaces[],
	query: string,
): LinkGroup[] {
	const rows: LinkRow[] = elections
		.filter(({ election }) =>
			matchesWords([String(election.year), election.name, election.countryName], query),
		)
		.map(({ election }) => ({
			key: `election:${electionPath(election)}`,
			label: electionName(election),
			description: election.countryName,
			slot: null,
			href: electionPath(election),
		}))

	const groups: LinkGroup[] = [{ heading: 'Elections', rows }]

	// An empty query gives no group of an election (`searchGroups`).
	for (const { election, races } of elections) {
		for (const group of searchGroups(races, query)) {
			groups.push({
				heading: `${group.heading}, ${electionName(election)}`,
				rows: group.rows.map(({ step, ...row }) => ({
					...row,
					href: drawerHref(electionPath(election), step),
				})),
			})
		}
	}

	return groups.filter((group) => group.rows.length > 0)
}

/** The name of an election with its year, such as `2026 Midterms`. */
function electionName(election: Election): string {
	return `${election.year} ${election.name}`
}
