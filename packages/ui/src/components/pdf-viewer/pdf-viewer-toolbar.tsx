'use client'

import { Highlighter, PanelLeft, PanelLeftDashed, RotateCw, ScanSearch } from 'lucide-react'
import { Glyph } from '../../primitives/glyph'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { IconButton } from '../icon-button'
import { SheetTrigger } from '../sheet'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerMagnifierSettings } from './pdf-viewer-magnifier-settings'
import { pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerPageNavigation } from './pdf-viewer-page-navigation'
import { PdfViewerSearch } from './pdf-viewer-search'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar. It carries the thumbnail control, page
 * navigation, zoom and rotate, and the download and print actions. The bar
 * keeps one row. When it is narrow, it scrolls on the inline axis. On desktop,
 * the thumbnail control toggles the sidebar. Below the desktop breakpoint, it
 * opens the thumbnails in a Sheet. The highlight visibility toggle appears when
 * there are regions, the magnifier control when the consumer asked for a
 * loupe, and the search control when the consumer gave OCR `data`.
 *
 * Reads everything from {@link PdfViewerContext}. The bar shows while the document opens and
 * after it opens with a page. A load that failed, or a document with no page, has nothing to
 * control, so the bar does not render and the pane shows only its message. The thumbnail rail
 * follows the same rule.
 *
 * While the document opens, the controls are disabled, except the thumbnail control, because
 * the rail shows then. The page navigation is disabled until the count arrives. The controls
 * work while the pages render, because the open gives every page slot.
 *
 * The magnifier control is one of two, and {@link PdfViewerMagnifierMode} says which: a
 * toggle, or the button that opens {@link PdfViewerMagnifierSettings}.
 *
 * @internal
 */
export function PdfViewerToolbar() {
	const {
		pages,
		total,
		loading,
		pending,
		targetPage,
		goToPage,
		zoom,
		rotate,
		documentSrc,
		filename,
		hasHighlights,
		highlightsVisible,
		setHighlightsVisible,
		magnifierOn,
		setMagnifierOn,
		magnifierMode,
	} = usePdfViewerContext()

	const intl = useIntl()

	// `pending` is the render before the load starts, which is also the server render.
	const opening = loading || pending

	// The page count is whole when the document opens, so every control works while the
	// pages render. Before the open, the count is 0.
	const controlsDisabled = total === 0

	// A failed load and a document with no page have no controls to offer. The bar keeps its
	// place while the document opens, so the page does not shift when the document lands.
	if (total === 0 && !opening) return null

	return (
		<div className={k().toolbar.frame}>
			<Toolbar
				aria-label={intl.formatMessage(pdfViewerMessages.controls)}
				className={k().toolbar.base}
			>
				<div className={k().toolbar.section}>
					<ThumbnailsToggle />
					<PdfViewerPageNavigation pages={pages} page={targetPage} goToPage={goToPage} />
				</div>

				<div className={k().toolbar.section}>
					{/* Renders nothing where the search is not offered. */}
					<PdfViewerSearch disabled={controlsDisabled} />
					<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
					<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.view)}>
						<IconButton
							variant="plain"
							lockable={false}
							tooltip
							aria-label={intl.formatMessage(pdfViewerMessages.rotate)}
							icon={<Glyph icon={RotateCw} />}
							disabled={controlsDisabled}
							onClick={rotate}
						/>
						{/* Only offered when there is something to hide. The toggle keeps its glyph and
						    its name, so `aria-pressed` and the held-down wash give its state. */}
						{hasHighlights && (
							<IconButton
								variant="plain"
								lockable={false}
								tooltip
								aria-label={intl.formatMessage(pdfViewerMessages.highlights)}
								icon={<Glyph icon={Highlighter} />}
								pressed={highlightsVisible}
								onPressedChange={setHighlightsVisible}
								disabled={controlsDisabled}
							/>
						)}
						{/* The two magnifier controls, and `magnifierMode` says which: `null` where the
					    consumer asked for no loupe, which is what keeps both out of the bar. The
					    toggle stays put once switched off: that is the press that brings it back. In
					    `'config'` mode the press opens the dialog, and the switch it took the place
					    of is in there. */}
						{magnifierMode === 'simple' && (
							<IconButton
								variant="plain"
								lockable={false}
								tooltip
								aria-label={intl.formatMessage(pdfViewerMessages.magnifierToggle)}
								icon={<Glyph icon={ScanSearch} />}
								pressed={magnifierOn}
								onPressedChange={setMagnifierOn}
								disabled={controlsDisabled}
							/>
						)}
						{magnifierMode === 'config' && (
							<PdfViewerMagnifierSettings disabled={controlsDisabled} />
						)}
					</ToolbarGroup>
					{documentSrc && (
						<>
							<ToolbarSeparator />
							<PdfViewerDocumentActions
								src={documentSrc}
								filename={filename}
								disabled={controlsDisabled}
							/>
						</>
					)}
				</div>
			</Toolbar>
		</div>
	)
}

/**
 * The thumbnail control of the toolbar: a toggle of the rail where the rail is pinned, and
 * the opener of the thumbnail Sheet elsewhere.
 * @internal
 */
function ThumbnailsToggle() {
	const { railed, offcanvas, sidebarOpen, setSidebarOpen } = usePdfViewerContext()

	const intl = useIntl()

	const glyph = k({ offcanvas }).toolbar.glyph

	// One control at each width. Where the rail is pinned, it toggles the rail. Elsewhere,
	// `SheetTrigger` makes it the opener of the modal Sheet, which has its own close. The
	// server renders the pinned layout at each width, so the CSS picks the glyph of the open
	// rail. The rail sits at the inline start, so the glyph mirrors in RTL.
	const toggle = (
		<IconButton
			variant="plain"
			lockable={false}
			tooltip
			aria-label={intl.formatMessage(
				railed && sidebarOpen ? pdfViewerMessages.hideThumbnails : pdfViewerMessages.showThumbnails,
			)}
			aria-expanded={railed ? sidebarOpen : undefined}
			icon={
				sidebarOpen
					? [
							<Glyph icon={PanelLeftDashed} key="rail" className={glyph.rail} />,
							<Glyph icon={PanelLeft} key="sheet" className={glyph.sheet} />,
						]
					: PanelLeft
			}
			mirror
			onClick={railed ? () => setSidebarOpen(!sidebarOpen) : undefined}
		/>
	)

	return railed ? toggle : <SheetTrigger>{toggle}</SheetTrigger>
}
