import type { ReactNode } from 'react'
import { ElectionRacesProvider } from '@/components/election-drawer'
import { ElectionViews, OfficeView, OverviewView } from '@/components/election-views'
import { ElectionHeader } from '@/components/elections-header'
import { PageColumn } from '@/components/page-frame'
import { RaceSearch } from '@/components/race-search'
import { officeRaces } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { getElectionResults } from '@/server/results'
import { ELECTIONS, electionPath } from '@/utilities/registry'
import { OVERVIEW, pageTitle } from '@/utilities/trail'

/**
 * The elections of the registry, which prerender with the build. The static
 * shell of each page holds this layout with its results. Cache Components
 * serves the shell, and renders the next one in the background. Thus a visit
 * does not wait for civicAPI, and a link prefetches the election with its code
 * before the click.
 */
export function generateStaticParams(): ElectionParams[] {
	return ELECTIONS.map((election) => ({
		year: String(election.year),
		country: election.country,
		election: election.slug,
	}))
}

/**
 * The frame of the pages of an election. The header lives here, not in each
 * page, so a navigation inside the election keeps it in place. Its trail ends
 * at the election, or at the state on a page of a state: the office switch
 * names the office, and the Drawer names the state that it shows. There is no
 * loading page: a navigation keeps the page in view until the next page is
 * whole, and a reload paints the whole page in its first frame.
 *
 * The layout also gives the races of each office to the Drawer of each page
 * and to the search in the header. A navigation between the pages keeps the
 * layout, so the races do not travel again with each page.
 *
 * The layout renders the view of each page: the overview and the national map
 * of each office. The view of the current page shows, and the other views stay
 * mounted and hidden, so a switch shows a view that is already rendered. On a
 * page of a state, each of these views is hidden, and the layout of the state
 * renders the views of the state. A page holds only its Drawer.
 */
export default async function ElectionLayout({
	params,
	children,
}: {
	params: Promise<ElectionParams>
	children: ReactNode
}) {
	const election = await readElection(params)

	const results = await getElectionResults(election)

	const races = officeRaces(results)

	const views = {
		[OVERVIEW]: {
			title: pageTitle(election),
			view: <OverviewView election={election} results={results} />,
		},
		...Object.fromEntries(
			results.map((result) => [
				result.contest.slug,
				{
					title: pageTitle(election, result.contest.label),
					view: <OfficeView key={result.contest.slug} election={election} result={result} />,
				},
			]),
		),
	}

	return (
		<PageColumn>
			<ElectionRacesProvider races={races}>
				<ElectionHeader election={election} search={<RaceSearch election={election} />} />

				<ElectionViews base={electionPath(election)} views={views} />

				{children}
			</ElectionRacesProvider>
		</PageColumn>
	)
}
