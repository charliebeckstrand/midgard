import type { ReactNode } from 'react'
import { StackedLayout, StackedLayoutBody } from 'ui/layouts'

/** Props for {@link PageFrame}. */
export type PageFrameProps = {
	/** The bar at the top of the page (`PicksHeader` or `WeekHeaderSkeleton`). */
	header: ReactNode
	children: ReactNode
}

/**
 * The frame of a page: the header on top, and the body under it. The frame has
 * the height of the viewport, and the body scrolls in it, so the document is
 * never taller than the screen (see `StackedLayout`). Each page has its own
 * body, so a navigation to a new page starts at the top. In print, the frame
 * has the height of its content, so each page prints whole.
 */
export function PageFrame({ header, children }: PageFrameProps) {
	return (
		<StackedLayout className="h-dvh print:h-auto">
			{header}

			<StackedLayoutBody>{children}</StackedLayoutBody>
		</StackedLayout>
	)
}
