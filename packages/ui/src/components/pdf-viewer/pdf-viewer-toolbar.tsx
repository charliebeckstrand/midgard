'use client'

import { Highlighter, PanelLeft, PanelLeftDashed, RotateCw, ScanSearch } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerMagnifierSettings } from './pdf-viewer-magnifier-settings'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar: the thumbnail toggle (collapses the desktop
 * sidebar, opens the mobile Sheet), page navigation, zoom and rotate, the highlight
 * visibility toggle when there are regions, the magnifier control when the consumer asked for
 * a loupe, and the download / print actions. Reads everything from {@link PdfViewerContext};
 * controls disable while loading or empty.
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
		loading,
		isDesktop,
		sidebarOpen,
		setSidebarOpen,
		thumbsOpen,
		setThumbsOpen,
		hasHighlights,
		highlightsVisible,
		setHighlightsVisible,
		magnifierOn,
		setMagnifierOn,
		magnifierMode,
	} = usePdfViewerContext()

	const isEmpty = total === 0

	const controlsDisabled = loading || isEmpty

	const sidebarToggleLabel = sidebarOpen ? 'Hide thumbnails' : 'Show thumbnails'

	const highlightsToggleLabel = highlightsVisible ? 'Hide highlights' : 'Show highlights'

	// Names the action rather than the state, matching the toggles above it.
	const magnifierToggleLabel = magnifierOn ? 'Turn magnifier off' : 'Turn magnifier on'

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar.base)}>
			<div className={cn(k.toolbar.section)}>
				{total > 0 && (
					<>
						{isDesktop && (
							<PdfViewerToolbarButton
								label={sidebarToggleLabel}
								icon={sidebarOpen ? <PanelLeftDashed /> : <PanelLeft />}
								aria-expanded={sidebarOpen}
								disabled={loading}
								onClick={() => setSidebarOpen(!sidebarOpen)}
							/>
						)}

						{!isDesktop && (
							<PdfViewerToolbarButton
								label="Show thumbnails"
								icon={<PanelLeft />}
								aria-expanded={thumbsOpen}
								disabled={loading}
								onClick={() => setThumbsOpen(true)}
							/>
						)}

						<ToolbarGroup aria-label="Page navigation">
							<Listbox<number>
								aria-label="Current page"
								value={safePage}
								onValueChange={(next) => {
									if (next !== null) goToPage(next)
								}}
								displayValue={(v) => String(v)}
								disabled={loading}
								className="tabular-nums"
							>
								{pages.map((p, index) => {
									const pageNumber = index + 1

									return (
										<ListboxOption key={p.id ?? index} value={pageNumber}>
											<ListboxLabel>{p.label ?? `Page ${pageNumber}`}</ListboxLabel>
										</ListboxOption>
									)
								})}
							</Listbox>
							<span className="mx-1 select-none">/</span>
							<span data-slot="pdf-viewer-page-status" className={cn(k.toolbar.pageStatus)}>
								{total}
							</span>
						</ToolbarGroup>
					</>
				)}
			</div>

			<div className={cn(k.toolbar.section)}>
				<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
				<ToolbarGroup aria-label="View">
					<PdfViewerToolbarButton
						label="Rotate"
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
					{magnifierMode === 'config' && <PdfViewerMagnifierSettings disabled={controlsDisabled} />}
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
	)
}
