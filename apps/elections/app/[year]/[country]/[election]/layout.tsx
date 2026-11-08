import type { ReactNode } from 'react'
import { ElectionRacesProvider } from '@/components/election-drawer'
import { ElectionsHeader } from '@/components/elections-header'
import { PageColumn } from '@/components/page-frame'
import { officeRaces } from '@/server/drawer'
import { type ElectionParams, readElection } from '@/server/params'
import { electionResults } from '@/server/results'
import { electionCrumbs } from '@/utilities/trail'

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
 */
export default async function ElectionLayout({
	params,
	children,
}: {
	params: Promise<ElectionParams>
	children: ReactNode
}) {
	const election = await readElection(params)

	const races = officeRaces(await electionResults(election))

	return (
		<PageColumn>
			<ElectionsHeader crumbs={electionCrumbs(election)} />

			<ElectionRacesProvider races={races}>{children}</ElectionRacesProvider>
		</PageColumn>
	)
}
