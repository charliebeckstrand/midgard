/**
 * The elections that the app shows. A new election is one more entry, with
 * the same routes and screens: the screens read the `depth` and the
 * `majority` of each contest, never the name of an office.
 */

/** One office of an election, such as the Senate. */
export type Contest = {
	/** The segment of the office in the URL, such as `senate`. */
	slug: string
	/** The name of the office, such as `Senate`. */
	label: string
	/** The name of the office in the plural, for a list of its seats, such as `Governors`. */
	plural: string
	/** The civicAPI race that gives the race of each region and the seats of each party. */
	aggregate: number
	/**
	 * Where the races of the office sit: one in each `state`, or one in each
	 * `district` of a state.
	 */
	depth: 'state' | 'district'
	/** The number of seats, the whole chamber or every governorship. */
	seats: number
	/** The seats that win control. A contest with no control, such as the governors, has none. */
	majority?: number
}

/** Whether the votes of an election are being counted, are still to come, or are in. */
export type ElectionStatus = 'live' | 'upcoming' | 'past'

/** One election, such as the 2026 midterms of the US. */
export type Election = {
	year: number
	/** The lowercase ISO 3166-1 alpha-2 code of the country, such as `us`. */
	country: string
	countryName: string
	/** The segment of the election in the URL, unique in its country and year, such as `midterms`. */
	slug: string
	/** The name of the election, such as `Midterms`. */
	name: string
	/** The election day, as an ISO date. */
	date: string
	status: ElectionStatus
	/** The offices, in the order of the office switch. */
	contests: readonly Contest[]
}

/** The elections, newest first. */
export const ELECTIONS: readonly Election[] = [
	{
		year: 2026,
		country: 'us',
		countryName: 'United States',
		slug: 'midterms',
		name: 'Midterms',
		date: '2026-11-03',
		status: 'live',
		contests: [
			{
				slug: 'senate',
				label: 'Senate',
				plural: 'Senate',
				aggregate: 87528,
				depth: 'state',
				seats: 100,
				majority: 51,
			},
			{
				slug: 'house',
				label: 'House',
				plural: 'House',
				aggregate: 87524,
				depth: 'district',
				seats: 435,
				majority: 218,
			},
			{
				slug: 'governor',
				label: 'Governor',
				plural: 'Governors',
				aggregate: 87535,
				depth: 'state',
				seats: 50,
			},
		],
	},
]

/** The election of a year, a country, and a slug, or `undefined` for one the registry does not hold. */
export function findElection(year: string, country: string, slug: string): Election | undefined {
	return ELECTIONS.find(
		(election) =>
			String(election.year) === year && election.country === country && election.slug === slug,
	)
}

/** The elections of a year, and of one country where `country` is given. */
export function findElections(year: string, country?: string): Election[] {
	return ELECTIONS.filter(
		(election) =>
			String(election.year) === year && (country === undefined || election.country === country),
	)
}

/** The contest of an office slug, or `undefined` for a slug that names no office of the election. */
export function findContest(election: Election, slug: string): Contest | undefined {
	return election.contests.find((contest) => contest.slug === slug)
}

/** The path of an election, such as `/2026/us/midterms`. */
export function electionPath(election: Election): string {
	return `/${election.year}/${election.country}/${election.slug}`
}
