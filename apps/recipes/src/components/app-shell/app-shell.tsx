'use client'

import type { ReactNode } from 'react'
import { type BreadcrumbStep, BreadcrumbTrail } from 'ui/breadcrumb'
import { Flex } from 'ui/flex'
import { SectionNav } from './section-nav'

/** Props for {@link AppShell}. */
export type AppShellProps = {
	/** The title, as a trail. One step is a page title; more is a path to it. */
	steps: readonly BreadcrumbStep[]
	/** Controls on the title row, beside the section switch. */
	actions?: ReactNode
	/**
	 * The row under the title.
	 *
	 * Absent on a page with nothing to narrow, and the row is not drawn at all
	 * rather than drawn empty — an empty bar is a control the reader looks at
	 * twice. A detail page puts its own actions here instead, because that is
	 * where a reader who came from the list has just been looking.
	 */
	filters?: ReactNode
	children: ReactNode
}

/** The one border every row of the frame is separated by. */
const EDGE = 'border-zinc-950/10 dark:border-white/10'

/**
 * The frame every page in this app is drawn in: a title row, an optional row
 * under it, and the body between them and the foot of the window.
 *
 * The two fixed rows and the flexing body are what keep the page itself from
 * scrolling. The body is the one thing that does, so a filter bar stays put
 * while a long list moves under it.
 */
export function AppShell({ steps, actions, filters, children }: AppShellProps) {
	return (
		<Flex direction="col" className="h-full">
			<Flex
				justify="between"
				align="center"
				gap="md"
				className={`shrink-0 border-b ${EDGE} px-6 py-4`}
			>
				{/* `min-w-0` on the wrapper is what lets the trail give way at all:
				    without it this flex child holds its full width and pushes the
				    controls beside it off the row instead of collapsing. `flex-1` is what
				    lets it come back: the trail measures the box it is given, and a box
				    that shrinks to the trail would narrow with it and never report the
				    room to expand again. */}
				<div className="min-w-0 flex-1">
					<BreadcrumbTrail className="text-xl/8" steps={steps} />
				</div>

				<Flex gap="md" align="center" className="shrink-0">
					<SectionNav />

					{actions}
				</Flex>
			</Flex>

			{filters === undefined ? null : (
				// No padding on this wrapper: the rail carries its own, so the whole
				// padded band sits inside the scroll container and a wheel anywhere over
				// it scrolls — the strip above and below the controls included.
				<div className={`shrink-0 border-b ${EDGE}`}>{filters}</div>
			)}

			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</Flex>
	)
}
