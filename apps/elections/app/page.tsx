import { ElectionList } from '@/components/election-list'
import { PageFrame } from '@/components/page-frame'
import { RaceSearch } from '@/components/race-search'
import { officeRaces } from '@/server/drawer'
import { electionResults } from '@/server/results'
import { homeCrumbs, listedElections } from '@/utilities/trail'

/**
 * Every election of the registry: live ones first, then upcoming, then past.
 * The title of the header is the heading of the page. The search of the header
 * holds each election, and the states and the races of each election with
 * results.
 */
export default async function Page() {
	const elections = listedElections()

	const searched = await Promise.all(
		elections.map(async (election) => ({
			election,
			races: election.status === 'upcoming' ? [] : officeRaces(await electionResults(election)),
		})),
	)

	return (
		<PageFrame crumbs={homeCrumbs()} search={<RaceSearch elections={searched} />}>
			<ElectionList elections={elections} />
		</PageFrame>
	)
}
