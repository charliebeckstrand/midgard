import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ElectionDrawer } from '@/components/election-drawer'
import { type Contest, type Election, findContest } from '@/elections/registry'
import type { UsState } from '@/elections/us-states'
import { drawerSeed, type SearchParams } from '@/server/drawer'
import { readSection, type SectionParams } from '@/server/params'
import { electionResults } from '@/server/results'

type Params = {
	params: Promise<SectionParams & { office: string }>
	searchParams: SearchParams
}

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

/**
 * The election, the state, and the office of the page, or the not-found page
 * where the section is not a state or the election has no such office.
 */
async function readStateOffice(
	params: Params['params'],
): Promise<{ election: Election; state: UsState; contest: Contest }> {
	const [section, { office }] = await Promise.all([readSection(params), params])

	if (section.kind !== 'state') notFound()

	const contest = findContest(section.election, office)

	if (contest === undefined) notFound()

	return { election: section.election, state: section.state, contest }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { election, state, contest } = await readStateOffice(params)

	return { title: `${election.year} ${election.name} ${state.name} ${contest.label}` }
}

/**
 * The page of an office in a state, such as the Senate in Georgia. The layout
 * of the state renders its view; the page holds the Drawer. An office with no
 * race in the state renders the not-found page.
 */
export default async function StateOfficePage({ params, searchParams }: Params) {
	const { election, state, contest } = await readStateOffice(params)

	const all = await electionResults(election)

	const entries = all.flatMap((result) => result.entries)

	if (
		!entries.some((entry) => entry.contest.slug === contest.slug && entry.state.key === state.key)
	) {
		notFound()
	}

	const seed = await drawerSeed(election, all, searchParams)

	return <ElectionDrawer election={election} seed={seed} />
}
