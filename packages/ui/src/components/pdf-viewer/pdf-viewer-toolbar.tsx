'use client'

import { Highlighter, PanelLeft, PanelLeftDashed, RotateCw, ScanSearch } from 'lucide-react'

import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { SheetTrigger } from '../sheet'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerMagnifierSettings } from './pdf-viewer-magnifier-settings'
import { pageLabel, pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar. It carries the thumbnail control, page
 * navigation, zoom and rotate, and the download and print actions. The bar
 * keeps one row. When it is narrow, it scrolls on the inline axis. On desktop,
 * the thumbnail control toggles the sidebar. Below the desktop breakpoint, it
 * opens the thumbnails in a Sheet. The highlight visibility toggle appears when
 * there are regions, and the magnifier control when the consumer asked for a
 * loupe.
 *
 * Reads everything from {@link PdfViewerContext}. The controls disable only when the document
 * has no page. They work while the pages render, because the open gives every page slot.
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
		safePage,
		goToPage,
		zoom,
		rotate,
		documentSrc,
		filename,
		railed,
		sidebarOpen,
		setSidebarOpen,
		hasHighlights,
		highlightsVisible,
		setHighlightsVisible,
		magnifierOn,
		setMagnifierOn,
		magnifierMode,
	} = usePdfViewerContext()

	const intl = useIntl()

	const isEmpty = total === 0

	// The page count is whole when the document opens, so every control works while the
	// pages render.
	const controlsDisabled = isEmpty

	const showThumbnails = intl.formatMessage(pdfViewerMessages.showThumbnails)

	const sidebarToggleLabel = sidebarOpen
		? intl.formatMessage(pdfViewerMessages.hideThumbnails)
		: showThumbnails

	const highlightsToggleLabel = intl.formatMessage(
		highlightsVisible ? pdfViewerMessages.hideHighlights : pdfViewerMessages.showHighlights,
	)

	// Names the action rather than the state, matching the toggles above it.
	const magnifierToggleLabel = intl.formatMessage(
		magnifierOn ? pdfViewerMessages.magnifierOff : pdfViewerMessages.magnifierOn,
	)

	return (
		<div className={cn(k.toolbar.frame)}>
			<Toolbar
				aria-label={intl.formatMessage(pdfViewerMessages.controls)}
				className={cn(k.toolbar.base)}
			>
				<div className={cn(k.toolbar.section)}>
					{total > 0 && (
						<>
							{railed && (
								<PdfViewerToolbarButton
									label={sidebarToggleLabel}
									icon={
										// The rail sits at the inline start, so the glyph mirrors in RTL.
										sidebarOpen ? (
											<PanelLeftDashed className="rtl:-scale-x-100" />
										) : (
											<PanelLeft className="rtl:-scale-x-100" />
										)
									}
									aria-expanded={sidebarOpen}
									disabled={controlsDisabled}
									onClick={() => setSidebarOpen(!sidebarOpen)}
								/>
							)}

							{/* A dialog opener, unlike the desktop toggle above it. The modal Sheet covers this
						    button while open and carries its own close, so the button has one action and
						    one name. `SheetTrigger` stamps `aria-haspopup` and the `aria-expanded` that
						    reports the Sheet. The `Sheet` root in `PdfViewer` holds the state. */}
							{!railed && (
								<SheetTrigger>
									<PdfViewerToolbarButton
										label={showThumbnails}
										icon={<PanelLeft className="rtl:-scale-x-100" />}
										disabled={controlsDisabled}
									/>
								</SheetTrigger>
							)}

							<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.pageNavigation)}>
								<Listbox<number>
									aria-label={intl.formatMessage(pdfViewerMessages.currentPage)}
									value={safePage}
									onValueChange={(next) => {
										if (next !== null) goToPage(next)
									}}
									displayValue={(pageNumber) => intl.formatNumber(pageNumber)}
									disabled={controlsDisabled}
									className="tabular-nums"
								>
									{pages.map((page, index) => {
										const pageNumber = index + 1

										return (
											<ListboxOption key={page.id ?? index} value={pageNumber}>
												<ListboxLabel>{pageLabel(intl, page, pageNumber)}</ListboxLabel>
											</ListboxOption>
										)
									})}
								</Listbox>
								{/* A screen reader reads "of 12", not "slash 12". The visible count is hidden from it,
								    because the sentence below says the count in the language of the reader. */}
								<span aria-hidden="true" className="mx-1 select-none">
									/
								</span>
								{/* `-total`, not `-status`: the viewport's live region owns that anchor. */}
								<span data-slot="pdf-viewer-page-total" className={cn(k.toolbar.total)}>
									<span aria-hidden="true">{intl.formatNumber(total)}</span>
									<span className="sr-only">
										{intl.formatMessage(pdfViewerMessages.ofTotal, { total })}
									</span>
								</span>
							</ToolbarGroup>
						</>
					)}
				</div>

				<div className={cn(k.toolbar.section)}>
					<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
					<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.view)}>
						<PdfViewerToolbarButton
							label={intl.formatMessage(pdfViewerMessages.rotate)}
							icon={<RotateCw />}
							disabled={controlsDisabled}
							onClick={rotate}
						/>
						{/* Only offered when there is something to hide. `active` carries the two-state
					    treatment and the argument for it. */}
						{hasHighlights && (
							<PdfViewerToolbarButton
								label={highlightsToggleLabel}
								icon={<Highlighter />}
								active={highlightsVisible}
								aria-pressed={highlightsVisible}
								disabled={controlsDisabled}
								onClick={() => setHighlightsVisible(!highlightsVisible)}
							/>
						)}
						{/* The two magnifier controls, and `magnifierMode` says which — `null` where the
					    consumer asked for no loupe, which is what keeps both out of the bar. The
					    toggle stays put once switched off: that is the press that brings it back. In
					    `'config'` mode the press opens the dialog, and the switch it took the place
					    of is in there. */}
						{magnifierMode === 'simple' && (
							<PdfViewerToolbarButton
								label={magnifierToggleLabel}
								icon={<ScanSearch />}
								active={magnifierOn}
								aria-pressed={magnifierOn}
								disabled={controlsDisabled}
								onClick={() => setMagnifierOn(!magnifierOn)}
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
