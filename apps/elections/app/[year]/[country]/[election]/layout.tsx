import type { ReactNode } from 'react'
import { ElectionHeader } from '@/components/elections-header'
import { PageColumn } from '@/components/page-frame'
import { type ElectionParams, readElection } from '@/server/params'

/**
 * The frame of the pages of an election. The header lives here, not in each
 * page, so a navigation inside the election keeps it in place. There is no
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
			<ElectionHeader election={election} />

			{children}
		</PageColumn>
	)
}
