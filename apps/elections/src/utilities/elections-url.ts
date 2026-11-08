import { type Contest, type Election, electionPath, findContest } from '../elections/registry'
import { stateOfKey, type UsState } from '../elections/us-states'

/**
 * Where a page is in an election: the region of the trail and the office.
 *
 * - No region and no office: the overview of the election.
 * - An office with no region: the national map of the office.
 * - A region with no office: the Overview tab of the state.
 * - A region and an office: the tab of the office in the state.
 * - A district too: the race of one district of the state.
 */
export type RaceLocation = {
	region: UsState | null
	contest: Contest | null
	/** The district of a district race: two digits such as `06`, or `al` for an at-large seat. */
	district: string | null
}

/** The search param that opens the Drawer on a state of a national map. */
export const REGION_PARAM = 'region'

/** The search param that opens the Drawer on a county of a state tab. */
export const COUNTY_PARAM = 'county'

/** A district segment: two digits, or `al` for the at-large seat of a state. */
const DISTRICT = /^(\d{2}|al)$/

/**
 * Reads the segments of the path after the election, against the registry
 * entry. The segment that names an office is the office, the segment before it
 * is the region, and one segment after it is the district. Returns `null` for
 * a path that names no page of the election, which renders the not-found page.
 */
export function parseRacePath(
	election: Election,
	segments: readonly string[],
): RaceLocation | null {
	const [first, second, third, ...rest] = segments

	if (rest.length > 0) return null

	if (first === undefined) return { region: null, contest: null, district: null }

	const office = findContest(election, first)

	if (office !== undefined) {
		return second === undefined ? { region: null, contest: office, district: null } : null
	}

	const region = stateOfKey(first)

	if (region === undefined) return null

	if (second === undefined) return { region, contest: null, district: null }

	const contest = findContest(election, second)

	if (contest === undefined) return null

	if (third === undefined) return { region, contest, district: null }

	if (contest.depth !== 'district' || !DISTRICT.test(third)) return null

	return { region, contest, district: third }
}

/** The path of a location in an election, such as `/2026/us/midterms/ga/house/06`. */
export function racePath(election: Election, location: Partial<RaceLocation>): string {
	const segments = [
		location.region?.key,
		location.contest?.slug,
		location.region ? location.district : undefined,
	].filter((segment): segment is string => typeof segment === 'string')

	return [electionPath(election), ...segments].join('/')
}

/** The key of a district in civicAPI, such as `ga-06`. */
export function districtKey(region: string, district: string): string {
	return `${region}-${district}`
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
