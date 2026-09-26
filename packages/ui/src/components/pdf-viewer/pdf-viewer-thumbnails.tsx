'use client'

import { X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useScrollWithin } from '../../hooks'
import { Hold, useMountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/pdf-viewer'
import { Flex } from '../../structure/flex'
import { Button } from '../button'
import { Icon } from '../icon'
import { Sheet, SheetBody, SheetTitle } from '../sheet'
import { usePdfViewerContext } from './context'
import { PdfViewerThumbnailList } from './pdf-viewer-thumbnail-list'

/**
 * Page thumbnail navigation: a collapsible sidebar on desktop, a left-side Sheet
 * on mobile. Both render {@link PdfViewerThumbnailList}; the sidebar adds roving
 * arrow-key focus across tiles.
 *
 * @remarks Renders nothing when there are no pages and the document isn't
 * loading. The desktop sidebar collapses via the toolbar toggle (`sidebarOpen`),
 * sliding off-canvas while staying mounted for the transition. When collapsed it
 * is `inert` and `aria-hidden`, off the tab order and a11y tree. Once the slide
 * lands, its contents drop into `<Activity mode="hidden">`, so a long document's
 * thumbnail rail stops laying out and re-rendering behind a closed sidebar. The
 * attributes cover the collapsed sidebar's semantics from the first frame, and
 * the hold covers its cost from the last one. The mobile Sheet is
 * portaled into the viewer root so it overlays the viewer rather than the page.
 * @internal
 */
export function PdfViewerThumbnails() {
	const {
		pages,
		safePage,
		goToPage,
		loading,
		isDesktop,
		sidebarOpen,
		sidebarAnimates,
		thumbsOpen,
		setThumbsOpen,
		rootRef,
		showThumbnails,
	} = usePdfViewerContext()

	const scrollCurrentIntoView = useScrollWithin()

	// The sidebar is always mounted; the hold only decides whether its contents
	// are live, and defers to the slide so the rail doesn't blank mid-transition.
	// Deferred only where there is a slide to wait on: a rail that opens without
	// traveling fires no `transitionend`, so a deferred hold would wait forever.
	const sidebarHold = useMountHold(sidebarOpen, 'always', { defer: sidebarAnimates })

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
					aria-hidden={!sidebarOpen}
					inert={!sidebarOpen}
					className={cn(
						k.sidebar.base,
						sidebarAnimates && k.sidebar.travel,
						!sidebarOpen && k.sidebar.closed,
					)}
					onKeyDown={handleSidebarKeyDown}
					// The slide is a CSS margin transition, so its landing is the
					// element's own `transitionend` rather than an animation callback.
					// Hiding on the toggle instead would blank the rail before it left,
					// since `display: none` can't slide. The event names the physical
					// margin, which is the right one in a right-to-left layout.
					onTransitionEnd={(event) => {
						if (event.propertyName === 'margin-left' || event.propertyName === 'margin-right') {
							sidebarHold.rest()
						}
					}}
				>
					<Hold hold={sidebarHold} name="pdf-viewer-sidebar">
						<div className={cn(k.sidebar.header)}>Pages</div>
						<PdfViewerThumbnailList
							items={thumbnailList}
							loading={loading}
							safePage={safePage}
							goToPage={goToPage}
							scrollCurrentIntoView={scrollCurrentIntoView}
							onVisibleChange={showThumbnails}
						/>
					</Hold>
				</aside>
			)}

			{!isDesktop && (
				<Sheet
					side="start"
					open={thumbsOpen}
					onOpenChange={setThumbsOpen}
					container={rootRef.current}
				>
					<SheetTitle>
						<Flex gap="sm" justify="between" align="center">
							<div>Pages</div>
							<Button
								type="button"
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
							onVisibleChange={showThumbnails}
							layout="grid"
						/>
					</SheetBody>
				</Sheet>
			)}
		</>
	)
}
