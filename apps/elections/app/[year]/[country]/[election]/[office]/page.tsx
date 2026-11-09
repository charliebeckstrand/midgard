import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AutoUpdateRefresh } from '@/components/auto-update'
import { ElectionDrawer } from '@/components/election-drawer'
import { type Contest, type Election, findContest, findElection } from '@/elections/registry'
import { drawerSeed, officeRaces, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults } from '@/server/results'
import { isCounting } from '@/utilities/results'

type Params = { params: Promise<ElectionParams & { office: string }>; searchParams: SearchParams }

/** The offices of each election of the registry, which prerender with the build, as the layout does. */
export function generateStaticParams({ params }: { params: ElectionParams }): { office: string }[] {
	const election = findElection(params.year, params.country, params.election)

	return (election?.contests ?? []).map((contest) => ({ office: contest.slug }))
}

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
 * The page of an office of an election. The layout renders the national map
 * of the office; the page holds the Drawer and the live refresh.
 */
export default async function OfficePage({ params, searchParams }: Params) {
	const { election, contest } = await readOffice(params)

	const all = await electionResults(election)

	const result = all.find((entry) => entry.contest.slug === contest.slug)

	if (result === undefined) notFound()

	const seed = await drawerSeed(election, officeRaces(all), searchParams)

	return (
		<>
			<AutoUpdateRefresh live={isCounting(result.entries)} />

			<ElectionDrawer election={election} seed={seed} />
		</>
	)
}
