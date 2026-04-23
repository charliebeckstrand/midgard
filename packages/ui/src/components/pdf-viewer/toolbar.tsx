'use client'

import { Download, Maximize2, PanelLeft, Printer, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '../../core'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import type { PdfViewerPage } from './component'
import { downloadPdf, printPdf } from './utilities'
import { k } from './variants'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export type PdfViewerToolbarProps = {
	pages: PdfViewerPage[]
	total: number
	safePage: number
	goToPage: (page: number) => void
	zoom: number
	setZoom: React.Dispatch<React.SetStateAction<number>>
	minZoom: number
	maxZoom: number
	zoomStep: number
	setRotation: React.Dispatch<React.SetStateAction<number>>
	src?: string
	filename?: string
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
	setZoom,
	minZoom,
	maxZoom,
	zoomStep,
	setRotation,
	src,
	filename,
	isDesktop,
	thumbsOpen,
	onThumbsOpen,
}: PdfViewerToolbarProps) {
	const isEmpty = total === 0

	const zoomIn = () => setZoom((z) => clamp(z * zoomStep, minZoom, maxZoom))
	const zoomOut = () => setZoom((z) => clamp(z / zoomStep, minZoom, maxZoom))

	const fit = () => setZoom(1)

	const rotate = () => setRotation((r) => r + 90)

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
							<Button
								variant="plain"
								aria-label="Show thumbnails"
								aria-expanded={thumbsOpen}
								prefix={<Icon icon={<PanelLeft />} />}
								onClick={onThumbsOpen}
							/>
						)}

						<ToolbarGroup aria-label="Page navigation">
							<Listbox<number>
								aria-label="Current page"
								value={safePage}
								onChange={(next) => {
									if (next !== undefined) goToPage(next)
								}}
								displayValue={(v) => String(v)}
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
					<Button
						variant="plain"
						aria-label="Zoom out"
						disabled={isEmpty || zoom <= minZoom}
						prefix={<Icon icon={<ZoomOut />} />}
						onClick={zoomOut}
					/>
					<Button
						variant="plain"
						aria-label="Zoom in"
						disabled={isEmpty || zoom >= maxZoom}
						prefix={<Icon icon={<ZoomIn />} />}
						onClick={zoomIn}
					/>
					<Button
						variant="plain"
						aria-label="Fit to page"
						disabled={isEmpty || zoom === 1}
						prefix={<Icon icon={<Maximize2 />} />}
						onClick={fit}
					/>
					<Button
						variant="plain"
						aria-label="Rotate"
						disabled={isEmpty}
						prefix={<Icon icon={<RotateCw />} />}
						onClick={rotate}
					/>
				</ToolbarGroup>
				{src && (
					<>
						<ToolbarSeparator />
						<ToolbarGroup aria-label="Document">
							<Button
								variant="plain"
								aria-label="Download"
								disabled={isEmpty}
								prefix={<Icon icon={<Download />} />}
								onClick={download}
							/>
							<Button
								variant="plain"
								aria-label="Print"
								disabled={isEmpty}
								prefix={<Icon icon={<Printer />} />}
								onClick={print}
							/>
						</ToolbarGroup>
					</>
				)}
			</div>
		</Toolbar>
	)
}
