import type { Election, ElectionStatus } from '../elections/registry'

/**
 * The pages of a level: every election, the elections of a year, and the
 * elections of a country in a year. Each level page is the same compilation of
 * the elections of its scope, with the same views and the same filters.
 */

/**
 * The filters of a level page. A `null` field filters nothing. The filters
 * name only what every election has, a year and a country, so they hold for
 * the elections of each country.
 */
export type LevelFilterValue = {
	year: string | null
	country: string | null
}

/** The filter value that filters nothing. */
export const NO_FILTER: LevelFilterValue = { year: null, country: null }

/** One option of a filter of a level page. */
export type LevelFilterOption = { value: string; label: string }

/** The options of each filter of a level page. */
export type LevelFilterOptions = Record<keyof LevelFilterValue, LevelFilterOption[]>

/** The distinct options of a field of the elections, in the order that the elections give them. */
function distinct(
	elections: readonly Election[],
	options: (election: Election) => LevelFilterOption[],
): LevelFilterOption[] {
	const byValue = new Map<string, LevelFilterOption>()

	for (const election of elections) {
		for (const option of options(election)) {
			if (!byValue.has(option.value)) byValue.set(option.value, option)
		}
	}

	return [...byValue.values()]
}

/**
 * The options of each filter for the elections of a level. A filter with fewer
 * than two options narrows nothing, so the page does not show it: the page of a
 * country shows no country filter.
 */
export function levelFilterOptions(elections: readonly Election[]): LevelFilterOptions {
	return {
		year: distinct(elections, (election) => [
			{ value: String(election.year), label: String(election.year) },
		]),
		country: distinct(elections, (election) => [
			{ value: election.country, label: election.countryName },
		]),
	}
}

/** The number of the fields of a filter value that filter something. */
export function activeFilters(filter: LevelFilterValue): number {
	return Object.values(filter).filter((value) => value !== null).length
}

/** The elections that each field of a filter value lets through. */
export function filterElections(
	elections: readonly Election[],
	filter: LevelFilterValue,
): Election[] {
	return elections.filter(
		(election) =>
			(filter.year === null || String(election.year) === filter.year) &&
			(filter.country === null || election.country === filter.country),
	)
}

/** One group of the list view: the elections of one status. */
export type StatusGroup = { status: ElectionStatus; heading: string; elections: Election[] }

const HEADINGS: Record<ElectionStatus, string> = {
	live: 'Counting now',
	upcoming: 'Upcoming',
	past: 'Past',
}

/**
 * The groups of the list view: the elections that are counted now, then the
 * elections to come, the nearest first, then the past elections, the newest
 * first. A group with no election is left out.
 */
export function statusGroups(elections: readonly Election[]): StatusGroup[] {
	const order: ElectionStatus[] = ['live', 'upcoming', 'past']

	return order
		.map((status) => ({
			status,
			heading: HEADINGS[status],
			elections: elections
				.filter((election) => election.status === status)
				.sort((a, b) =>
					status === 'upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
				),
		}))
		.filter((group) => group.elections.length > 0)
}

/** The ISO date of a day of the calendar, which the calendar builds from local parts. */
export function isoDay(day: Date): string {
	const month = String(day.getMonth() + 1).padStart(2, '0')

	const date = String(day.getDate()).padStart(2, '0')

	return `${day.getFullYear()}-${month}-${date}`
}

/** The day of an ISO date as local midnight, as the calendar reads a day. */
export function localDay(iso: string): Date {
	const [year = 0, month = 1, date = 1] = iso.split('-').map(Number)

	return new Date(year, month - 1, date)
}

/**
 * The day that the calendar view opens on: the day of the first election that
 * is counted now, else of the nearest election to come, else of the newest
 * past election. `null` for no election.
 */
export function openingDay(elections: readonly Election[]): string | null {
	const [first] = statusGroups(elections)

	return first?.elections[0]?.date ?? null
}
