import type { ReactNode } from 'react'
import { ElectionRacesProvider } from '@/components/election-drawer'
import { ElectionViews } from '@/components/election-views'
import { OfficeView, OverviewView } from '@/components/election-views/views'
import { ElectionsHeader } from '@/components/elections-header'
import { PageColumn } from '@/components/page-frame'
import { officeRaces } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults } from '@/server/results'
import { electionCrumbs, OVERVIEW } from '@/utilities/trail'

/**
 * The frame of the pages of an election. The header lives here, not in each
 * page, so a navigation inside the election keeps it in place. Its trail ends
 * at the election on each page: the office switch names the office, and the
 * Drawer names the state. There is no
 * loading page: a navigation keeps the page in view until the next page is
 * whole, and a reload paints the whole page in its first frame.
 *
 * The layout also gives the races of each office to the Drawer of each page.
 * A navigation between the pages keeps the layout, so the races do not travel
 * again with each page.
 *
 * The layout renders the view of each page: the overview and the national map
 * of each office. The view of the current page shows, and the other views stay
 * mounted and hidden, so a switch shows a view that is already rendered. A
 * page holds only its Drawer and its live refresh.
 */
export default async function ElectionLayout({
	params,
	children,
}: {
	params: Promise<ElectionParams>
	children: ReactNode
}) {
	const election = await readElection(params)

	const results = await electionResults(election)

	const races = officeRaces(results)

	const views = {
		[OVERVIEW]: <OverviewView election={election} results={results} />,
		...Object.fromEntries(
			results.map((result) => [
				result.contest.slug,
				<OfficeView key={result.contest.slug} election={election} result={result} />,
			]),
		),
	}

	return (
		<PageColumn>
			<ElectionsHeader crumbs={electionCrumbs(election)} />

			<ElectionRacesProvider races={races}>
				<ElectionViews views={views} />

				{children}
			</ElectionRacesProvider>
		</PageColumn>
	)
}
