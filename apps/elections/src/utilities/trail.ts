import { ELECTIONS, type Election, electionPath, findElections } from '../elections/registry'
import { OVERVIEW, officePath } from './elections-url'

/**
 * The trail of a page, which is its title: the list of every election, the
 * year, the country, and the election, such as
 * `Elections › 2026 › United States › Midterms`. The office is not a crumb,
 * because the office switch under the title names it. A state is not a crumb,
 * because the Drawer shows it.
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

/** The trail of a page of an election, from the list of every election down to the election. */
export function electionCrumbs(election: Election): Crumb[] {
	const year = String(election.year)

	return [
		...countryCrumbs(year, election.countryName).map((crumb) => ({
			...crumb,
			href: crumb.href ?? `/${year}/${election.country}`,
		})),
		{ label: election.name, href: electionPath(election), menu: electionMenu(election) },
	]
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
	/** The value of the item: {@link OVERVIEW}, or the slug of an office. */
	value: string
	label: string
	/** The page of the item. */
	href: string
	/** The office has no race in the state, so the item takes no pick. */
	disabled: boolean
}

/**
 * The items of the office switch: the overview, then each office. The page
 * switch leads to the page of each, and the switch of the Drawer moves the
 * Drawer. In the Drawer, an office with no race in the state stays in the list,
 * disabled, so the list keeps its shape from state to state.
 *
 * @param election - The election of the page.
 * @param offices - The slugs of the offices with a race in the state of the
 * Drawer. Omit it for the switch of a page, where each office has races.
 */
export function officeItems(election: Election, offices?: ReadonlySet<string>): OfficeItem[] {
	return [
		{ value: OVERVIEW, label: 'Overview', href: officePath(election, null), disabled: false },
		...election.contests.map((contest) => ({
			value: contest.slug,
			label: contest.label,
			href: officePath(election, contest),
			disabled: offices !== undefined && !offices.has(contest.slug),
		})),
	]
}
