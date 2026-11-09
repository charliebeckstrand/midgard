import type { ReactNode } from 'react'
import { StackedLayout, StackedLayoutBody } from 'ui/layouts'
import { Container } from 'ui/structure/container'
import { Stack } from 'ui/structure/stack'
import type { Crumb } from '../../utilities/trail'
import { ElectionsFooter, type ElectionsFooterProps } from '../elections-footer'
import { ElectionsHeader } from '../elections-header'

/** Props for {@link PageBody}. */
export type PageBodyProps = {
	/**
	 * The status of the foot. A page with no results leaves it out, and then
	 * the page has no foot: the foot gives the sources of the results.
	 */
	status?: ElectionsFooterProps
	children: ReactNode
}

/** Props for {@link PageFrame}. */
export type PageFrameProps = PageBodyProps & {
	crumbs: readonly Crumb[]
	/** The search of the header, such as the search of every election. */
	search?: ReactNode
}

/**
 * The body and the foot of a page: the box that scrolls under the header. The
 * layout of an election puts them under its header, which stays in place from
 * page to page. The header, the body, and the foot share one container width,
 * so their edges line up.
 *
 * Each view of an election has its own body, so each view keeps its own
 * scroll position from switch to switch.
 */
export function PageBody({ status, children }: PageBodyProps) {
	return (
		<StackedLayoutBody>
			{/* A column at least as tall as the body, so the foot is at the bottom of a short page. */}
			<div className="flex min-h-full flex-col">
				<Container size="lg" padding="lg" className="py-6">
					<Stack gap="xl">{children}</Stack>
				</Container>

				{status === undefined ? null : <ElectionsFooter {...status} />}
			</div>
		</StackedLayoutBody>
	)
}

/**
 * The column of a page: the header on top, and the body under it. The column
 * has the height of the viewport, and the body scrolls in it, so the document
 * is never taller than the screen (see `StackedLayout`). In print, the column has the height of its content,
 * so each page prints whole.
 */
export function PageColumn({ children }: { children: ReactNode }) {
	return <StackedLayout className="h-dvh print:h-auto">{children}</StackedLayout>
}

/** The frame of a page outside an election: the header with the trail, and the body. */
export function PageFrame({ crumbs, search, ...body }: PageFrameProps) {
	return (
		<PageColumn>
			<ElectionsHeader crumbs={crumbs} search={search} />

			<PageBody {...body} />
		</PageColumn>
	)
}
