import type { Metadata } from 'next'
import { LiveRefresh } from 'shared/refresh'
import { Heading } from 'ui/heading'
import { Columns } from 'ui/structure/columns'
import { Stack } from 'ui/structure/stack'
import { ClosestRaces } from '@/components/closest-races'
import { ElectionDrawer } from '@/components/election-drawer'
import { LatestCalls } from '@/components/latest-calls'
import { PageBody } from '@/components/page-frame'
import { PageTitle } from '@/components/page-title'
import { SeatCard } from '@/components/seat-card'
import { UncalledTable } from '@/components/uncalled-table'
import { drawerSeed, officeRaces, type SearchParams } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults, latestCalls } from '@/server/results'
import { officePath } from '@/utilities/elections-url'
import { isCounting, newestUpdate } from '@/utilities/results'
import { OVERVIEW, officeItems } from '@/utilities/trail'

type Params = { params: Promise<ElectionParams>; searchParams: SearchParams }

/** The page reads the results before it renders, so the first frame has them. */
export const instant = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const election = await readElection(params)

	return { title: `${election.year} ${election.name}` }
}

/**
 * The overview of an election: the balance of power of each chamber, the
 * closest races, the latest calls, and every race not called. A race opens
 * the Drawer.
 */
export default async function OverviewPage({ params, searchParams }: Params) {
	const election = await readElection(params)

	const results = await electionResults(election)

	const races = officeRaces(results)

	// The two reads do not depend on each other, so a cache miss waits for one upstream read, not two.
	const [seed, calls] = await Promise.all([
		drawerSeed(election, races, searchParams),
		latestCalls(results, 5),
	])

	const entries = results.flatMap((result) => result.entries)

	const uncalled = entries.filter((entry) => !entry.called)

	const counting = isCounting(entries)

	return (
		<PageBody
			status={{ counting, updated: newestUpdate(results.map((result) => result.national)) }}
		>
			<LiveRefresh live={counting} />

			<PageTitle heading="Balance of power" items={officeItems(election)} value={OVERVIEW} />

			<Columns columns={{ initial: 1, md: 2, lg: 3 }}>
				{results.map((result) => (
					<SeatCard
						key={result.contest.slug}
						contest={result.contest}
						parties={result.national.parties}
						href={officePath(election, result.contest)}
					/>
				))}
			</Columns>

			<ClosestRaces election={election} entries={uncalled} office />

			<section>
				<Stack gap="sm">
					<Heading level={2}>Latest calls</Heading>

					<LatestCalls election={election} calls={calls} />
				</Stack>
			</section>

			<UncalledTable election={election} entries={uncalled} />

			<ElectionDrawer election={election} results={races} seed={seed} />
		</PageBody>
	)
}
