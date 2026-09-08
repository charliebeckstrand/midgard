'use client'

import { PanelLeft, PanelLeftDashed, RotateCw } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar: the thumbnail toggle (collapses the desktop
 * sidebar, opens the mobile Sheet), page navigation, zoom and rotate, and the
 * download / print actions. Reads everything from {@link PdfViewerContext};
 * controls disable while loading or empty.
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
	} = usePdfViewerContext()

	const isEmpty = total === 0

	const controlsDisabled = loading || isEmpty

	const sidebarToggleLabel = sidebarOpen ? 'Hide thumbnails' : 'Show thumbnails'

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar.base)}>
			<div className={cn(k.toolbar.section)}>
				{total > 0 && (
					<>
						{isDesktop && (
							<PdfViewerToolbarButton
								label={sidebarToggleLabel}
								icon={sidebarOpen ? <PanelLeftDashed /> : <PanelLeft />}
								expanded={sidebarOpen}
								disabled={loading}
								onClick={() => setSidebarOpen(!sidebarOpen)}
							/>
						)}

						{!isDesktop && (
							<PdfViewerToolbarButton
								label="Show thumbnails"
								icon={<PanelLeft />}
								expanded={thumbsOpen}
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
