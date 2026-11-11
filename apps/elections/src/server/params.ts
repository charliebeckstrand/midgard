import { notFound } from 'next/navigation'
import { type Contest, type Election, findContest, findElection } from '../utilities/registry'
import { findStateBySlug, type UsState } from '../utilities/us-states'

/** The params of a route of an election. */
export type ElectionParams = { year: string; country: string; election: string }

/** The election that the params of a route name. A route that names none renders the not-found page. */
export async function readElection(params: Promise<ElectionParams>): Promise<Election> {
	const { year, country, election } = await params

	const found = findElection(year, country, election)

	if (found === undefined) notFound()

	return found
}

/** The params of a route under an election: an office, or a state. */
export type SectionParams = ElectionParams & { section: string }

/** The page that a section segment names: an office of the election, or a state. */
export type Section =
	| { election: Election; kind: 'office'; contest: Contest }
	| { election: Election; kind: 'state'; state: UsState }

/**
 * The election and the section of the params of a route, such as the Senate in
 * `/2026/us/midterms/senate` or Georgia in `/2026/us/midterms/georgia`. A
 * segment that names no office and no state renders the not-found page.
 */
export async function readSection(params: Promise<SectionParams>): Promise<Section> {
	const [election, { section }] = await Promise.all([readElection(params), params])

	const contest = findContest(election, section)

	if (contest !== undefined) return { election, kind: 'office', contest }

	const state = findStateBySlug(section)

	if (state === undefined) notFound()

	return { election, kind: 'state', state }
}
