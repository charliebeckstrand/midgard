'use client'

import { Download, Maximize2, PanelLeft, Printer, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { downloadPdf, printPdf } from './pdf-viewer-utilities'
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

	const sortedLevels = [...zoom.levels].sort((a, b) => a - b)

	const minZoom = sortedLevels[0] ?? 1
	const maxZoom = sortedLevels[sortedLevels.length - 1] ?? 1

	const nextLevelUp = sortedLevels.find((l) => l > zoom.value + 1e-6) ?? maxZoom
	const nextLevelDown = [...sortedLevels].reverse().find((l) => l < zoom.value - 1e-6) ?? minZoom

	const zoomIn = () => zoom.setValue(nextLevelUp)
	const zoomOut = () => zoom.setValue(nextLevelDown)

	const fit = () => zoom.setValue(1)

	const download = () => {
		if (!src) return

		downloadPdf(src, filename)
	}

	const print = () => {
		if (!src) return

		printPdf(src)
	}

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
				<ToolbarGroup aria-label="Zoom">
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Zoom out"
								disabled={isLoading || isEmpty || zoom.value <= minZoom}
								onClick={zoomOut}
							>
								<Icon icon={<ZoomOut />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Zoom Out ({(nextLevelDown * 100).toFixed(0)}%)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Zoom in"
								disabled={isLoading || isEmpty || zoom.value >= maxZoom}
								onClick={zoomIn}
							>
								<Icon icon={<ZoomIn />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Zoom In ({(nextLevelUp * 100).toFixed(0)}%)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Fit to page"
								disabled={isLoading || isEmpty || zoom.value === 1}
								onClick={fit}
							>
								<Icon icon={<Maximize2 />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Fit to page</TooltipContent>
					</Tooltip>
				</ToolbarGroup>
				<ToolbarGroup aria-label="View">
					<Tooltip>
						<TooltipTrigger>
							<Button
								variant="plain"
								aria-label="Rotate"
								disabled={isLoading || isEmpty}
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
						<ToolbarGroup aria-label="Document">
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="plain"
										aria-label="Download"
										disabled={isLoading || isEmpty}
										onClick={download}
									>
										<Icon icon={<Download />} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Download</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger>
									<Button
										variant="plain"
										aria-label="Print"
										disabled={isLoading || isEmpty}
										onClick={print}
									>
										<Icon icon={<Printer />} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Print</TooltipContent>
							</Tooltip>
						</ToolbarGroup>
					</>
				)}
			</div>
		</Toolbar>
	)
}
