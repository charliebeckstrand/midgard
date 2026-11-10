import type { Metadata } from 'next'
import { ElectionDrawer } from '@/components/election-drawer'
import { drawerSeed, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults } from '@/server/results'

type Params = { params: Promise<ElectionParams>; searchParams: SearchParams }

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const election = await readElection(params)

	return { title: `${election.year} ${election.name}` }
}

/** The overview of an election. The layout renders its view; the page holds the Drawer. */
export default async function OverviewPage({ params, searchParams }: Params) {
	const election = await readElection(params)

	const results = await electionResults(election)

	const seed = await drawerSeed(election, results, searchParams)

	return <ElectionDrawer election={election} seed={seed} />
}
