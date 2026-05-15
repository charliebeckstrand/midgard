'use client'

import { PanelLeft, RotateCw } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'
import type { PdfViewerPage } from './types'

export type PdfViewerToolbarZoom = {
	value: number
	setValue: Dispatch<SetStateAction<number>>
	levels: number[]
}

export type PdfViewerToolbarProps = {
	pages: PdfViewerPage[]
	total: number
	safePage: number
	goToPage: (page: number) => void
	zoom: PdfViewerToolbarZoom
	onRotate: () => void
	src?: string
	filename?: string
	isLoading: boolean
	isDesktop: boolean
	thumbsOpen: boolean
	onThumbsOpen: () => void
}

export function PdfViewerToolbar({
	pages,
	total,
	safePage,
	goToPage,
	zoom,
	onRotate,
	src,
	filename,
	isLoading,
	isDesktop,
	thumbsOpen,
	onThumbsOpen,
}: PdfViewerToolbarProps) {
	const isEmpty = total === 0

	const controlsDisabled = isLoading || isEmpty

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar)}>
			<div className={cn(k.toolbarSection)}>
				{total > 0 && (
					<>
						{!isDesktop && (
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="plain"
										aria-label="Show thumbnails"
										aria-expanded={thumbsOpen}
										disabled={isLoading}
										onClick={onThumbsOpen}
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
								disabled={isLoading}
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
							<span className="mx-1">/</span>
							<span data-slot="pdf-viewer-page-status" className={cn(k.pageStatus)}>
								{total}
							</span>
						</ToolbarGroup>
					</>
				)}
			</div>

			<ToolbarSeparator />

			<div className={cn(k.toolbarSection)}>
				<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
				<ToolbarGroup aria-label="View">
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Rotate"
								disabled={controlsDisabled}
								onClick={onRotate}
							>
								<Icon icon={<RotateCw />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Rotate</TooltipContent>
					</Tooltip>
				</ToolbarGroup>
				{src && (
					<>
						<ToolbarSeparator />
						<PdfViewerDocumentActions src={src} filename={filename} disabled={controlsDisabled} />
					</>
				)}
			</div>
		</Toolbar>
	)
}
