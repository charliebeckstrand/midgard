'use client'

import { X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useScrollWithin } from '../../hooks'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Sheet, SheetBody, SheetTitle } from '../sheet'
import { usePdfViewerContext } from './context'
import { PdfViewerThumbnailList } from './pdf-viewer-thumbnail-list'

/**
 * Page thumbnail navigation: a pinned sidebar on desktop, a left-side Sheet on
 * mobile. Both render {@link PdfViewerThumbnailList}; the sidebar adds roving
 * arrow-key focus across tiles.
 *
 * @remarks Renders nothing when there are no pages and the document isn't
 * loading. The mobile Sheet is portaled into the viewer root so it overlays the
 * viewer rather than the page.
 * @internal
 */
export function PdfViewerThumbnails() {
	const { pages, safePage, goToPage, loading, isDesktop, thumbsOpen, setThumbsOpen, rootRef } =
		usePdfViewerContext()

	const scrollCurrentIntoView = useScrollWithin()

	const sidebarRef = useRef<HTMLElement>(null)

	const handleSidebarKeyDown = useA11yRoving(sidebarRef, {
		itemSelector: '[data-slot="pdf-viewer-thumbnail"]',
		orientation: 'vertical',
	})

	const thumbnailList = useMemo(
		() =>
			pages.map((p, index) => {
				const pageNumber = index + 1

				return {
					key: p.id ?? index,
					pageNumber,
					label: p.label ?? `Page ${pageNumber}`,
					thumbnail: p.thumbnail ?? p.src,
				}
			}),
		[pages],
	)

	if (pages.length === 0 && !loading) return null

	return (
		<>
			{isDesktop && (
				<aside
					ref={sidebarRef}
					data-slot="pdf-viewer-sidebar"
					className={cn(k.sidebar.base)}
					onKeyDown={handleSidebarKeyDown}
				>
					<div className={cn(k.sidebar.header)}>Pages</div>
					<PdfViewerThumbnailList
						items={thumbnailList}
						loading={loading}
						safePage={safePage}
						goToPage={goToPage}
						scrollCurrentIntoView={scrollCurrentIntoView}
					/>
				</aside>
			)}

			{!isDesktop && (
				<Sheet
					side="left"
					open={thumbsOpen}
					onOpenChange={setThumbsOpen}
					container={rootRef.current}
				>
					<SheetTitle>
						<Flex gap="sm" justify="between" align="center">
							<div>Pages</div>
							<Button
								variant="plain"
								aria-label="Close thumbnails"
								onClick={() => setThumbsOpen(false)}
							>
								<Icon icon={<X />} />
							</Button>
						</Flex>
					</SheetTitle>
					<SheetBody>
						<PdfViewerThumbnailList
							items={thumbnailList}
							loading={loading}
							safePage={safePage}
							goToPage={goToPage}
							scrollCurrentIntoView={scrollCurrentIntoView}
							onSelect={() => setThumbsOpen(false)}
							layout="grid"
						/>
					</SheetBody>
				</Sheet>
			)}
		</>
	)
}
