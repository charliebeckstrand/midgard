import type { ReactNode } from 'react'
import { Container } from 'ui/structure/container'
import { Stack } from 'ui/structure/stack'
import type { Crumb } from '../../utilities/trail'
import { ElectionsFooter, type ElectionsFooterProps } from '../elections-footer'
import { ElectionsHeader } from '../elections-header'

/** Props for {@link PageFrame}. */
export type PageFrameProps = {
	crumbs: readonly Crumb[]
	/** The status of the foot. A page with no results leaves it out. */
	status?: ElectionsFooterProps
	children: ReactNode
}

/**
 * The frame of each page: the header with the trail, the body, and the foot.
 * The header, the body, and the foot share one container width, so their
 * edges line up.
 */
export function PageFrame({ crumbs, status, children }: PageFrameProps) {
	return (
		<div className="flex min-h-dvh flex-col">
			<ElectionsHeader crumbs={crumbs} />

			<Container size="lg" padding="lg" className="py-6">
				<Stack gap="xl">{children}</Stack>
			</Container>

			<ElectionsFooter {...(status ?? { counting: false, reporting: null, updated: null })} />
		</div>
	)
}
