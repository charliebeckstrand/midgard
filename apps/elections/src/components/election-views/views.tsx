import { Heading } from 'ui/heading'
import { Columns } from 'ui/structure/columns'
import { Stack } from 'ui/structure/stack'
import { type ContestResult, getLatestCalls } from '../../server/results'
import type { Election } from '../../utilities/registry'
import { closestRaces, delegations, isCounting, newestUpdate } from '../../utilities/results'
import { OVERVIEW, officeItems } from '../../utilities/trail'
import { officePath } from '../../utilities/url'
import { ClosestRaces } from '../closest-races'
import { LatestCalls } from '../latest-calls'
import { NationalMap, stateRows } from '../national-map'
import { PageBody } from '../page-frame'
import { PageTitle } from '../page-title'
import { SeatCard } from '../seat-card'
import { UncalledTable } from '../uncalled-table'

/** The overview of an election: the balance of power, the closest races, the latest calls, and every race not called. */
export async function OverviewView({
	election,
	results,
}: {
	election: Election
	results: readonly ContestResult[]
}) {
	const calls = await getLatestCalls(results, 5)

	const entries = results.flatMap((result) => result.entries)

	const uncalled = entries.filter((entry) => !entry.called)

	return (
		<PageBody
			status={{
				counting: isCounting(entries),
				updated: newestUpdate(results.map((result) => result.national)),
			}}
		>
			<PageTitle heading="Overview" items={officeItems(election)} value={OVERVIEW} />

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

			<ClosestRaces election={election} entries={closestRaces(uncalled, 6)} office />

			<section>
				<Stack gap="sm">
					<Heading level={2}>Latest calls</Heading>

					<LatestCalls election={election} calls={calls} />
				</Stack>
			</section>

			<UncalledTable election={election} entries={uncalled} />
		</PageBody>
	)
}

/** The national map of an office of an election. */
export function OfficeView({ election, result }: { election: Election; result: ContestResult }) {
	const { contest } = result

	return (
		<PageBody status={{ counting: isCounting(result.entries), updated: result.national.updated }}>
			<NationalMap
				election={election}
				contest={contest}
				rows={stateRows(
					result.entries,
					contest.depth === 'district' ? delegations(result.entries) : null,
				)}
				closest={closestRaces(
					result.entries.filter((entry) => !entry.called),
					6,
				)}
				heading={contest.plural}
				items={officeItems(election)}
			/>
		</PageBody>
	)
}
