'use client'

import {
	Download,
	GalleryVertical,
	Maximize2,
	Printer,
	RotateCw,
	ZoomIn,
	ZoomOut,
} from 'lucide-react'
import { cn } from '../../core'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import type { PdfViewerPage } from './component'
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

		const link = document.createElement('a')

		link.href = src

		link.download = filename ?? ''

		link.rel = 'noopener'

		link.click()
	}

	const print = () => {
		if (!src) return

		const win = window.open(src, '_blank', 'noopener,noreferrer')

		win?.addEventListener('load', () => win.print())
	}

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar)}>
			<div className={cn(k.toolbarSection)}>
				{total > 0 && (
					<>
						{!isDesktop && (
							<>
								<Button
									variant="plain"
									aria-label="Show thumbnails"
									aria-expanded={thumbsOpen}
									onClick={onThumbsOpen}
								>
									<Icon icon={<GalleryVertical />} />
								</Button>
								<ToolbarSeparator />
							</>
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

			<div className={cn(k.toolbarSection)}>
				<ToolbarGroup aria-label="Zoom">
					<Button
						variant="plain"
						aria-label="Zoom out"
						disabled={isEmpty || zoom <= minZoom}
						onClick={zoomOut}
					>
						<Icon icon={<ZoomOut />} />
					</Button>
					<Button
						variant="plain"
						aria-label="Zoom in"
						disabled={isEmpty || zoom >= maxZoom}
						onClick={zoomIn}
					>
						<Icon icon={<ZoomIn />} />
					</Button>
					<Button
						variant="plain"
						aria-label="Fit to page"
						disabled={isEmpty || zoom === 1}
						onClick={fit}
					>
						<Icon icon={<Maximize2 />} />
					</Button>
					<Button variant="plain" aria-label="Rotate" disabled={isEmpty} onClick={rotate}>
						<Icon icon={<RotateCw />} />
					</Button>
				</ToolbarGroup>
				{src && (
					<>
						<ToolbarSeparator />
						<ToolbarGroup aria-label="Document">
							<Button variant="plain" aria-label="Download" disabled={isEmpty} onClick={download}>
								<Icon icon={<Download />} />
							</Button>
							<Button variant="plain" aria-label="Print" disabled={isEmpty} onClick={print}>
								<Icon icon={<Printer />} />
							</Button>
						</ToolbarGroup>
					</>
				)}
			</div>
		</Toolbar>
	)
}
