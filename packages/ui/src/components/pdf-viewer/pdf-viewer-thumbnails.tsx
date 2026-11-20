'use client'

import { type ReactElement, useId, useMemo, useRef } from 'react'
import { useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { useIntl } from '../../primitives/intl/use-intl'
import { MountHold } from '../../primitives/mount'
import { useMountHold } from '../../primitives/mount/use-mount'
import { k } from '../../recipes/kata/pdf-viewer'
import { scrollWithin } from '../../utilities/scroll-within'
import { SheetBody, SheetHeader, SheetPanel, SheetTitle } from '../sheet'
import { usePdfViewerContext } from './context'
import { pageLabel, pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerThumbnailList } from './pdf-viewer-thumbnail-list'
import {
	PdfViewerThumbnailMatches,
	PdfViewerThumbnailTooltip,
} from './pdf-viewer-thumbnail-matches'

/**
 * The mark of each tile: a search glyph on a page with a match. A module function, so the prop
 * keeps one identity and the rail does not render again for it.
 *
 * @internal
 */
function matchMarker(pageNumber: number, descriptionId: string) {
	return <PdfViewerThumbnailMatches pageNumber={pageNumber} id={descriptionId} />
}

/**
 * The tooltip of each tile: the number of search matches on its page. A module function, for
 * the reason that {@link matchMarker} is one.
 *
 * @internal
 */
function matchTooltip(pageNumber: number, tile: ReactElement) {
	return <PdfViewerThumbnailTooltip pageNumber={pageNumber}>{tile}</PdfViewerThumbnailTooltip>
}

/**
 * Page thumbnail navigation: a collapsible sidebar on desktop, a left-side Sheet
 * on mobile. Both render {@link PdfViewerThumbnailList}; the sidebar adds roving
 * arrow-key focus across tiles. A tile with a search match shows a search glyph, and its
 * tooltip gives the number of matches.
 *
 * @remarks Renders nothing when there are no pages and no load is in progress
 * or about to start. On the server and before the load, the rail shows its
 * loading tiles, so the first paint has the layout of the loaded viewer. The
 * desktop sidebar collapses via the toolbar toggle (`sidebarOpen`), sliding
 * off-canvas while staying mounted for the transition. When collapsed it is
 * `inert` and `aria-hidden`, off the tab order and a11y tree. Once the slide
 * lands, its contents drop into `<Activity mode="hidden">`, so a long document's
 * thumbnail rail stops laying out and re-rendering behind a closed sidebar. The
 * attributes cover the collapsed sidebar's semantics from the first frame, and
 * the hold covers its cost from the last one. The mobile Sheet is
 * portaled into the viewer root so it overlays the viewer rather than the page.
 * The server renders the sidebar at each width. Its `offcanvas` classes hide it
 * where `thumbnails` is a Sheet, until hydration removes it there.
 * @internal
 */
export function PdfViewerThumbnails() {
	const {
		pages,
		safePage,
		goToPage,
		loading,
		pending,
		railed,
		offcanvas,
		sidebarOpen,
		sidebarAnimates,
		setThumbsOpen,
		root,
		showThumbnails,
		searchOffered,
	} = usePdfViewerContext()

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

	const intl = useIntl()

	const thumbnails = useMemo(
		() =>
			pages.map((page, index) => {
				const pageNumber = index + 1

				return {
					key: page.id ?? index,
					pageNumber,
					label: pageLabel(intl, page, pageNumber),
					thumbnail: page.thumbnail ?? page.src,
					ratio: page.width && page.height ? page.width / page.height : undefined,
				}
			}),
		[pages, intl],
	)

	// The sidebar moves the view from page to page of the document, and it marks
	// the current page with `aria-current`. So it is a navigation landmark, which
	// the "Pages" header names. A complementary landmark is for content that
	// stays meaningful apart from the document, and the strip of pages does not.
	const sidebarTitleId = useId()

	// `pending` is the render before the load starts, which is also the server render.
	const opening = loading || pending

	if (pages.length === 0 && !opening) return null

	return (
		<>
			{railed && (
				<nav
					ref={sidebarRef}
					data-slot="pdf-viewer-sidebar"
					aria-labelledby={sidebarTitleId}
					aria-hidden={!sidebarOpen}
					inert={!sidebarOpen}
					className={k({ animates: sidebarAnimates, open: sidebarOpen, offcanvas }).sidebar.base}
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
					<MountHold hold={sidebarHold} name="pdf-viewer-sidebar">
						<div id={sidebarTitleId} className={k().sidebar.header}>
							{intl.formatMessage(pdfViewerMessages.pages)}
						</div>
						<PdfViewerThumbnailList
							items={thumbnails}
							loading={opening}
							safePage={safePage}
							goToPage={goToPage}
							scrollCurrentIntoView={scrollWithin}
							onVisibleChange={showThumbnails}
							marker={searchOffered ? matchMarker : undefined}
							wrapTile={searchOffered ? matchTooltip : undefined}
						/>
					</MountHold>
				</nav>
			)}

			{!railed && (
				<SheetPanel
					side="start"
					container={root}
					// The X beside the title closes the sheet, so it has no Close row.
					footer={null}
				>
					{/* The X of the closable header sits beside the `<h2>`, not in it: a
					    heading takes phrasing content only, and the title names the dialog. */}
					<SheetHeader closable>
						<SheetTitle>{intl.formatMessage(pdfViewerMessages.pages)}</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<PdfViewerThumbnailList
							items={thumbnails}
							loading={opening}
							safePage={safePage}
							goToPage={goToPage}
							scrollCurrentIntoView={scrollWithin}
							onSelect={() => setThumbsOpen(false)}
							onVisibleChange={showThumbnails}
							marker={searchOffered ? matchMarker : undefined}
							wrapTile={searchOffered ? matchTooltip : undefined}
							layout="grid"
						/>
					</SheetBody>
				</SheetPanel>
			)}
		</>
	)
}
