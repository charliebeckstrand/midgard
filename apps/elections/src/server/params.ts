import { notFound } from 'next/navigation'
import { type Election, findElection } from '../elections/registry'

/** The params of a route of an election. */
export type ElectionParams = { year: string; country: string; election: string }

/** The election that the params of a route name. A route that names none renders the not-found page. */
export async function readElection(params: Promise<ElectionParams>): Promise<Election> {
	const { year, country, election } = await params

	const found = findElection(year, country, election)

	if (found === undefined) notFound()

	return found
}
