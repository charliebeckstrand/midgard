import { ELECTIONS, type Election, electionPath } from '../elections/registry'
import type { UsState } from '../elections/us-states'
import { officePath, statePath } from './elections-url'

/**
 * The trail of a page, which is its title: the list of every election, the
 * year, the country, the election, and on the page of a state the state, such
 * as `Elections › 2026 › United States › Midterms › Georgia`. The office is not
 * a crumb, because the office switch under the title names it. The state of the
 * Drawer is not a crumb, because the Drawer shows it.
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

/**
 * The trail of a page of an election, from the list of every election down to
 * the election, and to the state on a page of a state.
 */
export function electionCrumbs(election: Election, state?: UsState): Crumb[] {
	const year = String(election.year)

	const crumbs: Crumb[] = [
		...countryCrumbs(year, election.countryName).map((crumb) => ({
			...crumb,
			href: crumb.href ?? `/${year}/${election.country}`,
		})),
		{ label: election.name, href: electionPath(election) },
	]

	if (state !== undefined)
		crumbs.push({ label: state.name, href: statePath(election, state, null) })

	return crumbs
}

/** The name of the app, after the title of each page but the home page. */
export const APP_NAME = 'Elections'

/**
 * The title of a page of an election, such as `2026 Midterms Georgia Senate`:
 * the year, the election, and each name under the election.
 */
export function pageTitle(election: Election, ...names: string[]): string {
	return [String(election.year), election.name, ...names].join(' ')
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

/** The state of the pages of an office switch, and the offices with a race in the state. */
export type StateScope = { state: UsState; offices: ReadonlySet<string> }

/**
 * The items of the office switch of a page: the overview, then each office.
 * Each item leads to its page: a national page, or a page of the state of
 * `scope`.
 */
export function officeItems(election: Election, scope?: StateScope): OfficeItem[] {
	return [
		{
			value: OVERVIEW,
			label: 'Overview',
			href:
				scope === undefined ? officePath(election, null) : statePath(election, scope.state, null),
			disabled: false,
		},
		...contestItems(election, scope?.offices, scope?.state),
	]
}

/**
 * The item of each office, such as for the office menu of the Drawer. In a
 * state, an office with no race in the state stays in the list, disabled, so
 * the list keeps its shape from state to state.
 *
 * @param election - The election of the page.
 * @param offices - The slugs of the offices with a race in the state. Omit it
 * where each office has races.
 * @param state - The state whose pages the items lead to. Omit it for the
 * national pages.
 */
export function contestItems(
	election: Election,
	offices?: ReadonlySet<string>,
	state?: UsState,
): OfficeItem[] {
	return election.contests.map((contest) => ({
		value: contest.slug,
		label: contest.label,
		href: state === undefined ? officePath(election, contest) : statePath(election, state, contest),
		disabled: offices !== undefined && !offices.has(contest.slug),
	}))
}
