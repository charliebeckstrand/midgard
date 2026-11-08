import { ELECTIONS, type Election, electionPath, findElections } from '../elections/registry'
import type { UsState } from '../elections/us-states'
import { districtName, type RaceLocation, racePath } from './elections-url'

/**
 * The trail of a page, which is its title: the year, the country, the
 * election, the state, and the district, such as
 * `2026 › United States › Midterms › Georgia › 6th District`. The office is
 * not a crumb, because the office switch under the title names it.
 */

/** One election of the menu of the election crumb. */
export type ElectionMenuItem = {
	label: string
	href: string
	/** The votes are being counted. */
	live: boolean
	/** The election day of an election to come, as an ISO date, or `null`. */
	upcoming: string | null
}

/** One crumb of the trail. */
export type Crumb = {
	label: string
	/** Where the crumb leads, or `undefined` for a crumb that leads nowhere. */
	href?: string
	/** The elections that the crumb switches between, for the election crumb. */
	menu?: readonly ElectionMenuItem[]
}

/** The label of the first crumb of each trail: the list of every election. */
const HOME_LABEL = 'Elections'

/** The trail of the page of every election. */
export function homeCrumbs(): Crumb[] {
	return [{ label: HOME_LABEL }]
}

/** The trail of the page of the elections of a year, under the list of every election. */
export function yearCrumbs(year: string): Crumb[] {
	return [{ label: HOME_LABEL, href: '/' }, { label: year }]
}

/** The trail of the page of the elections of a country in a year. */
export function countryCrumbs(year: string, countryName: string): Crumb[] {
	return [
		{ label: HOME_LABEL, href: '/' },
		{ label: year, href: `/${year}` },
		{ label: countryName },
	]
}

/** The elections of the year and the country of an election, for the menu of its crumb. */
function electionMenu(election: Election): ElectionMenuItem[] {
	return findElections(String(election.year), election.country).map((entry) => ({
		label: entry.name,
		href: electionPath(entry),
		live: entry.status === 'live',
		upcoming: entry.status === 'upcoming' ? entry.date : null,
	}))
}

/** The trail of a page of an election, from the list of every election down to the district. */
export function electionCrumbs(election: Election, location: RaceLocation): Crumb[] {
	const year = String(election.year)

	const crumbs: Crumb[] = [
		...countryCrumbs(year, election.countryName).map((crumb) => ({
			...crumb,
			href: crumb.href ?? `/${year}/${election.country}`,
		})),
		{ label: election.name, href: electionPath(election), menu: electionMenu(election) },
	]

	if (location.region === null) return crumbs

	crumbs.push({
		label: location.region.name,
		href: racePath(election, { region: location.region }),
	})

	if (location.district !== null && location.contest !== null) {
		crumbs.push({ label: districtName(location.district) })
	}

	return crumbs
}

/** The elections of the registry in the order of the list: live ones first, then upcoming, then past. */
export function listedElections(elections: readonly Election[] = ELECTIONS): Election[] {
	const rank = { live: 0, upcoming: 1, past: 2 } as const

	return [...elections].sort(
		(a, b) => rank[a.status] - rank[b.status] || b.date.localeCompare(a.date),
	)
}

/** One item of the office switch: the overview or an office. */
export type OfficeItem = {
	/** The value of the item: `overview`, or the slug of an office. */
	value: string
	label: string
	href: string
	/** The office has no race in the state, so the item takes no click. */
	disabled: boolean
}

/** The value of the overview in the office switch. */
export const OVERVIEW = 'overview'

/**
 * The items of the office switch of a page: the overview, then each office.
 * On a state page, an office with no race in the state stays in the row,
 * disabled, so the row keeps its shape from state to state.
 *
 * @param election - The election of the page.
 * @param region - The state of a state page, or `null` on a national page.
 * @param offices - The slugs of the offices with a race in the state. Unused on a national page.
 */
export function officeItems(
	election: Election,
	region: UsState | null,
	offices: ReadonlySet<string> = new Set(),
): OfficeItem[] {
	return [
		{ value: OVERVIEW, label: 'Overview', href: racePath(election, { region }), disabled: false },
		...election.contests.map((contest) => ({
			value: contest.slug,
			label: contest.label,
			href: racePath(election, { region, contest }),
			disabled: region !== null && !offices.has(contest.slug),
		})),
	]
}
