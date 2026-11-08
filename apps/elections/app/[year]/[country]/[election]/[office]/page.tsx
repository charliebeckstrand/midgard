import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LiveRefresh } from 'shared/refresh'
import { ElectionDrawer } from '@/components/election-drawer'
import { NationalMap } from '@/components/national-map'
import { PageBody } from '@/components/page-frame'
import { type Contest, type Election, findContest } from '@/elections/registry'
import { drawerSeed, officeRaces, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults } from '@/server/results'
import { isCounting } from '@/utilities/results'
import { officeItems } from '@/utilities/trail'

type Params = { params: Promise<ElectionParams & { office: string }>; searchParams: SearchParams }

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

/** The election and the office of the page, or the not-found page for an office that it does not hold. */
async function readOffice(
	params: Params['params'],
): Promise<{ election: Election; contest: Contest }> {
	const [election, { office }] = await Promise.all([readElection(params), params])

	const contest = findContest(election, office)

	if (contest === undefined) notFound()

	return { election, contest }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { election, contest } = await readOffice(params)

	return { title: `${election.year} ${election.name} ${contest.label}` }
}

/**
 * The national map of an office of an election. A state of the map opens the
 * Drawer, which holds the races of the state.
 */
export default async function OfficePage({ params, searchParams }: Params) {
	const { election, contest } = await readOffice(params)

	const all = await electionResults(election)

	const result = all.find((entry) => entry.contest.slug === contest.slug)

	if (result === undefined) notFound()

	const results = officeRaces(all)

	const seed = await drawerSeed(election, results, searchParams)

	const counting = isCounting(result.entries)

	return (
		<PageBody status={{ counting, updated: result.national.updated }}>
			<LiveRefresh live={counting} />

			<NationalMap
				election={election}
				contest={contest}
				entries={result.entries}
				heading={contest.plural}
				items={officeItems(election)}
			/>

			<ElectionDrawer election={election} results={results} seed={seed} />
		</PageBody>
	)
}
