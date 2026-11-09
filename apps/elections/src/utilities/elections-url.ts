import { type Contest, type Election, electionPath, findContest } from '../elections/registry'
import { stateOfKey, stateSlug, type UsState } from '../elections/us-states'

/**
 * The step of the Drawer of an election, which the address holds, such as
 * `?region=ga&office=house&district=06&county=13121`.
 *
 * - A state alone: the overview, with the race of each office in the state.
 * - A state and a statewide office: the race in full, with its counties.
 * - A state and the House: the delegation and its districts.
 * - A district too: the race of the district in full, with its counties.
 * - A county too: the race in that county.
 */
export type DrawerStep = {
	region: UsState
	/** The slug of an office, or `null` for the overview of the state. */
	office: string | null
	/** The district of a district race: two digits such as `06`, or `al` for an at-large seat. */
	district: string | null
	/** The 5-digit FIPS code of a county. */
	county: string | null
}

/** The search params of the Drawer. */
const PARAMS = ['region', 'office', 'district', 'county'] as const

/** A district segment: two digits, or `al` for the at-large seat of a state. */
const DISTRICT = /^(\d{2}|al)$/

/** A 5-digit FIPS code of a county. */
const COUNTY = /^\d{5}$/

/**
 * Reads the step of the Drawer from the search params, against the registry
 * entry. A param that names nothing of the election is dropped with each param
 * under it, so a bad address opens the Drawer on the nearest step that it does
 * name, or keeps it closed.
 */
export function readDrawerStep(
	election: Election,
	params: { get: (name: string) => string | null },
): DrawerStep | null {
	const region = stateOfKey(params.get('region') ?? '')

	if (region === undefined) return null

	const contest = findContest(election, params.get('office') ?? '')

	if (contest === undefined) return { region, office: null, district: null, county: null }

	const district = params.get('district')

	const county = params.get('county')

	const step: DrawerStep = { region, office: contest.slug, district: null, county: null }

	if (contest.depth === 'district') {
		if (district === null || !DISTRICT.test(district)) return step

		step.district = district
	}

	if (county !== null && COUNTY.test(county)) step.county = county

	return step
}

/** The search params of a step of the Drawer, or none for a closed Drawer. */
export function drawerSearch(step: DrawerStep | null): URLSearchParams {
	const search = new URLSearchParams()

	if (step === null) return search

	const values = [step.region.key, step.office, step.district, step.county]

	PARAMS.forEach((name, index) => {
		const value = values[index]

		if (value !== null && value !== undefined) search.set(name, value)
	})

	return search
}

/** The path of an office of an election, or of its overview, such as `/2026/us/midterms/senate`. */
export function officePath(election: Election, contest: Contest | null): string {
	const base = electionPath(election)

	return contest === null ? base : `${base}/${contest.slug}`
}

/**
 * The path of a state in an election, or of an office in the state, such as
 * `/2026/us/midterms/georgia` or `/2026/us/midterms/georgia/senate`.
 */
export function statePath(election: Election, state: UsState, contest: Contest | null): string {
	const base = `${electionPath(election)}/${stateSlug(state)}`

	return contest === null ? base : `${base}/${contest.slug}`
}

/** The address of a page with its Drawer open on a step, such as `/2026/us/midterms?region=ga&office=senate`. */
export function drawerHref(path: string, step: DrawerStep | null): string {
	const query = drawerSearch(step).toString()

	return query === '' ? path : `${path}?${query}`
}

/** The district of a civicAPI key such as `ga-06`, or `null` for a key with no district. */
export function districtOfKey(key: string): string | null {
	const [, district] = key.split('-')

	return district !== undefined && DISTRICT.test(district) ? district : null
}

/** The English ordinal suffix of a number: `st`, `nd`, `rd`, or `th`. */
function ordinal(value: number): string {
	const tens = value % 100

	if (tens >= 11 && tens <= 13) return 'th'

	return ['th', 'st', 'nd', 'rd'][value % 10] ?? 'th'
}

/** The name of a district, such as `6th District`, or `At-large District` for `al`. */
export function districtName(district: string): string {
	if (district === 'al') return 'At-large District'

	const value = Number(district)

	return `${value}${ordinal(value)} District`
}
