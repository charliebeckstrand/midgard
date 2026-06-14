'use client'

import { PanelLeft, RotateCw } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar: page navigation (plus the mobile thumbnail
 * toggle), zoom and rotate, and the download / print actions. Reads everything
 * from {@link PdfViewerContext}; controls disable while loading or empty.
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
		thumbsOpen,
		setThumbsOpen,
	} = usePdfViewerContext()

	const isEmpty = total === 0

	const controlsDisabled = loading || isEmpty

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar.base)}>
			<div className={cn(k.toolbar.section)}>
				{total > 0 && (
					<>
						{!isDesktop && (
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="plain"
										aria-label="Show thumbnails"
										aria-expanded={thumbsOpen}
										disabled={loading}
										onClick={() => setThumbsOpen(true)}
									>
										<Icon icon={<PanelLeft />} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Show thumbnails</TooltipContent>
							</Tooltip>
						)}

						<ToolbarGroup aria-label="Page navigation">
							<Listbox<number>
								aria-label="Current page"
								value={safePage}
								onValueChange={(next) => {
									if (next !== undefined) goToPage(next)
								}}
								displayValue={(v) => String(v)}
								disabled={loading}
								tabularNums
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

			<ToolbarSeparator />

			<div className={cn(k.toolbar.section)}>
				<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
				<ToolbarGroup aria-label="View">
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Rotate"
								disabled={controlsDisabled}
								onClick={rotate}
							>
								<Icon icon={<RotateCw />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Rotate</TooltipContent>
					</Tooltip>
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
