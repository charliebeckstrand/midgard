import type { ReactNode } from 'react'
import { ElectionsHeader } from '@/components/elections-header'
import { PageColumn } from '@/components/page-frame'
import { type ElectionParams, readElection } from '@/server/params'
import { electionCrumbs } from '@/utilities/trail'

/**
 * The frame of the pages of an election. The header lives here, not in each
 * page, so a navigation inside the election keeps it in place. Its trail ends
 * at the election on each page: the office switch names the office, and the
 * Drawer names the state. There is no
 * loading page: a navigation keeps the page in view until the next page is
 * whole, and a reload paints the whole page in its first frame.
 */
export default async function ElectionLayout({
	params,
	children,
}: {
	params: Promise<ElectionParams>
	children: ReactNode
}) {
	const election = await readElection(params)

	return (
		<PageColumn>
			<ElectionsHeader crumbs={electionCrumbs(election)} />

			{children}
		</PageColumn>
	)
}
