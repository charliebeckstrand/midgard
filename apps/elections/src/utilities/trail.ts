import { ELECTIONS, type Election, electionPath } from '../elections/registry'
import { officePath } from './elections-url'

/**
 * The trail of a page, which is its title: the list of every election, the
 * year, the country, and the election, such as
 * `Elections › 2026 › United States › Midterms`. The office is not a crumb,
 * because the office switch under the title names it. A state is not a crumb,
 * because the Drawer shows it.
 */

/** One crumb of the trail. */
export type Crumb = {
	label: string
	/** Where the crumb leads, or `undefined` for a crumb that leads nowhere. */
	href?: string
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

/** The trail of a page of an election, from the list of every election down to the election. */
export function electionCrumbs(election: Election): Crumb[] {
	const year = String(election.year)

	return [
		...countryCrumbs(year, election.countryName).map((crumb) => ({
			...crumb,
			href: crumb.href ?? `/${year}/${election.country}`,
		})),
		{ label: election.name, href: electionPath(election) },
	]
}

/** The elections of the registry in the order of the list: live ones first, then upcoming, then past. */
export function listedElections(elections: readonly Election[] = ELECTIONS): Election[] {
	const rank = { live: 0, upcoming: 1, past: 2 } as const

	return [...elections].sort(
		(a, b) => rank[a.status] - rank[b.status] || b.date.localeCompare(a.date),
	)
}

/** The value of the overview in the office switch of a page, beside the slug of each office. */
export const OVERVIEW = 'overview'

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
 * The items of the office switch of a page: the overview, then each office.
 * Each item leads to its page.
 */
export function officeItems(election: Election): OfficeItem[] {
	return [
		{ value: OVERVIEW, label: 'Overview', href: officePath(election, null), disabled: false },
		...contestItems(election),
	]
}

/**
 * The item of each office, such as for the office menu of the Drawer. In the
 * Drawer, an office with no race in the state stays in the list, disabled, so
 * the list keeps its shape from state to state.
 *
 * @param election - The election of the page.
 * @param offices - The slugs of the offices with a race in the state of the
 * Drawer. Omit it where each office has races.
 */
export function contestItems(election: Election, offices?: ReadonlySet<string>): OfficeItem[] {
	return election.contests.map((contest) => ({
		value: contest.slug,
		label: contest.label,
		href: officePath(election, contest),
		disabled: offices !== undefined && !offices.has(contest.slug),
	}))
}
