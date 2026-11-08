import type { ReactNode } from 'react'
import { Container } from 'ui/structure/container'
import { Stack } from 'ui/structure/stack'
import type { Crumb } from '../../utilities/trail'
import { ElectionsFooter, type ElectionsFooterProps } from '../elections-footer'
import { ElectionsHeader } from '../elections-header'

/** Props for {@link PageBody}. */
export type PageBodyProps = {
	/** The status of the foot. A page with no results leaves it out. */
	status?: ElectionsFooterProps
	children: ReactNode
}

/** Props for {@link PageFrame}. */
export type PageFrameProps = PageBodyProps & { crumbs: readonly Crumb[] }

/**
 * The body and the foot of a page. The layout of an election puts them under
 * its header, which stays in place from page to page. The header, the body,
 * and the foot share one container width, so their edges line up.
 */
export function PageBody({ status, children }: PageBodyProps) {
	return (
		<>
			<Container size="lg" padding="lg" className="py-6">
				<Stack gap="xl">{children}</Stack>
			</Container>

			<ElectionsFooter {...(status ?? { counting: false, reporting: null, updated: null })} />
		</>
	)
}

/** The column of a page: the header on top, and the foot at the bottom of a short page. */
export function PageColumn({ children }: { children: ReactNode }) {
	return <div className="flex min-h-dvh flex-col">{children}</div>
}

/** The frame of a page outside an election: the header with the trail, the body, and the foot. */
export function PageFrame({ crumbs, ...body }: PageFrameProps) {
	return (
		<PageColumn>
			<ElectionsHeader crumbs={crumbs} />

			<PageBody {...body} />
		</PageColumn>
	)
}
