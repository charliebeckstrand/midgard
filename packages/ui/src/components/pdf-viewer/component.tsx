'use client'

import { Download, GalleryVertical, Printer, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useIsDesktop } from '../../hooks'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input } from '../input'
import { Sheet, SheetBody, SheetTitle } from '../sheet'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { k } from './variants'

export type PdfViewerPage = {
	/** Stable key. Falls back to the array index when omitted. */
	id?: string | number
	/** Image source for the rendered page. */
	src: string
	/** Optional smaller image for the thumbnail sidebar. Falls back to `src`. */
	thumbnail?: string
	/** Optional accessible label for the page. Falls back to `Page N`. */
	label?: string
}

export type PdfViewerProps = {
	/** Pre-rendered page images, in order. */
	pages: PdfViewerPage[]
	/**
	 * Source URL for the underlying PDF. Used for download and print.
	 * When omitted, those toolbar actions are hidden.
	 */
	src?: string
	/** Filename used for the download attribute. */
	filename?: string
	/** Controlled current page (1-based). */
	page?: number
	/** Initial page in uncontrolled mode (1-based). */
	defaultPage?: number
	onPageChange?: (page: number) => void
	/** Initial zoom scale. Defaults to 1. */
	defaultZoom?: number
	/** Lower zoom bound. */
	minZoom?: number
	/** Upper zoom bound. */
	maxZoom?: number
	/** Multiplicative step applied per zoom-in / zoom-out. */
	zoomStep?: number
	/** Initial rotation in degrees. Snaps to multiples of 90. */
	defaultRotation?: number
	className?: string
	'aria-label'?: string
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function PdfViewer({
	pages,
	src,
	filename,
	page,
	defaultPage = 1,
	onPageChange,
	defaultZoom = 1,
	minZoom = 0.5,
	maxZoom = 4,
	zoomStep = 1.25,
	defaultRotation = 0,
	className,
	'aria-label': ariaLabel = 'PDF viewer',
}: PdfViewerProps) {
	const total = pages.length

	const isDesktop = useIsDesktop()

	const [currentPage = defaultPage, setCurrentPage] = useControllable<number>({
		value: page,
		defaultValue: defaultPage,
		onChange: (next) => {
			if (next !== undefined) onPageChange?.(next)
		},
	})

	const [zoom, setZoom] = useState(defaultZoom)
	const [rotation, setRotation] = useState(defaultRotation)
	const [pageDraft, setPageDraft] = useState<string | null>(null)
	const [thumbsOpen, setThumbsOpen] = useState(false)

	const pageInputId = useId()

	const safePage = total > 0 ? clamp(currentPage, 1, total) : 0
	const activePage = total > 0 ? pages[safePage - 1] : undefined

	const goToPage = useCallback(
		(next: number) => {
			if (total === 0) return

			setCurrentPage(clamp(Math.round(next), 1, total))
		},
		[setCurrentPage, total],
	)

	const handlePageInputFocus = () => {
		if (total > 0) setPageDraft(String(safePage))
	}

	const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setPageDraft(event.target.value)
	}

	const commitPageInput = () => {
		if (pageDraft !== null) {
			const parsed = Number.parseInt(pageDraft, 10)

			if (!Number.isNaN(parsed)) goToPage(parsed)
		}

		setPageDraft(null)
	}

	const handlePageInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			commitPageInput()
		} else if (event.key === 'Escape') {
			event.preventDefault()
			setPageDraft(null)
			event.currentTarget.blur()
		}
	}

	const zoomIn = () => setZoom((z) => clamp(z * zoomStep, minZoom, maxZoom))
	const zoomOut = () => setZoom((z) => clamp(z / zoomStep, minZoom, maxZoom))

	const rotate = () => setRotation((r) => (r + 90) % 360)

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

	const thumbnailList = useMemo(
		() =>
			pages.map((p, index) => {
				const pageNumber = index + 1

				return {
					key: p.id ?? index,
					pageNumber,
					label: p.label ?? `Page ${pageNumber}`,
					thumbnail: p.thumbnail ?? p.src,
				}
			}),
		[pages],
	)

	const renderThumbnails = (onSelect?: () => void) => (
		<ul data-slot="pdf-viewer-thumbnails" className={cn(k.thumbnails)}>
			{thumbnailList.map((item) => {
				const isActive = item.pageNumber === safePage

				return (
					<li key={item.key}>
						<button
							type="button"
							data-slot="pdf-viewer-thumbnail"
							data-active={isActive || undefined}
							aria-label={`Go to ${item.label}`}
							aria-current={isActive ? 'page' : undefined}
							className={cn(k.thumbnail)}
							onClick={() => {
								goToPage(item.pageNumber)
								onSelect?.()
							}}
						>
							<span className={cn(k.thumbnailFrame)}>
								{item.thumbnail ? (
									<img
										src={item.thumbnail}
										alt=""
										loading="lazy"
										className={cn(k.thumbnailImage)}
									/>
								) : (
									<span className={cn(k.thumbnailFallback)}>{item.pageNumber}</span>
								)}
							</span>
							<span className={cn(k.thumbnailLabel)}>{item.pageNumber}</span>
						</button>
					</li>
				)
			})}
		</ul>
	)

	const pageInputValue = pageDraft ?? (safePage > 0 ? String(safePage) : '')

	return (
		<section data-slot="pdf-viewer" aria-label={ariaLabel} className={cn(k.base, className)}>
			<Toolbar aria-label="PDF controls" className={cn(k.toolbar)}>
				<div className={cn(k.toolbarSection)}>
					{!isDesktop && (
						<>
							<Button
								variant="plain"
								aria-label="Show thumbnails"
								aria-expanded={thumbsOpen}
								onClick={() => setThumbsOpen(true)}
							>
								<Icon icon={<GalleryVertical />} />
							</Button>
							<ToolbarSeparator />
						</>
					)}
					<ToolbarGroup aria-label="Page navigation">
						<label htmlFor={pageInputId} className="sr-only">
							Page number
						</label>
						<Input
							id={pageInputId}
							type="text"
							inputMode="numeric"
							size="sm"
							aria-label="Current page"
							className={cn(k.pageInput)}
							value={pageInputValue}
							disabled={total === 0}
							onFocus={handlePageInputFocus}
							onChange={handlePageInputChange}
							onKeyDown={handlePageInputKeyDown}
							onBlur={commitPageInput}
						/>
						<span data-slot="pdf-viewer-page-status" className={cn(k.pageStatus)}>
							/ {total}
						</span>
					</ToolbarGroup>
				</div>

				<div className={cn(k.toolbarSection)}>
					<ToolbarGroup aria-label="Zoom">
						<Button
							variant="plain"
							aria-label="Zoom out"
							disabled={zoom <= minZoom}
							onClick={zoomOut}
						>
							<Icon icon={<ZoomOut />} />
						</Button>
						<span data-slot="pdf-viewer-zoom" className={cn(k.zoomLabel)}>
							{Math.round(zoom * 100)}%
						</span>
						<Button
							variant="plain"
							aria-label="Zoom in"
							disabled={zoom >= maxZoom}
							onClick={zoomIn}
						>
							<Icon icon={<ZoomIn />} />
						</Button>
					</ToolbarGroup>
					<ToolbarSeparator />
					<Button variant="plain" aria-label="Rotate" onClick={rotate}>
						<Icon icon={<RotateCw />} />
					</Button>
					{src && (
						<>
							<ToolbarSeparator />
							<ToolbarGroup aria-label="Document">
								<Button variant="plain" aria-label="Download" onClick={download}>
									<Icon icon={<Download />} />
								</Button>
								<Button variant="plain" aria-label="Print" onClick={print}>
									<Icon icon={<Printer />} />
								</Button>
							</ToolbarGroup>
						</>
					)}
				</div>
			</Toolbar>

			<div className={cn(k.body)}>
				<aside data-slot="pdf-viewer-sidebar" className={cn(k.sidebar)}>
					<div className={cn(k.sidebarHeader)}>Pages</div>
					{renderThumbnails()}
				</aside>

				<div data-slot="pdf-viewer-viewport" className={cn(k.viewport)}>
					{activePage ? (
						<img
							key={activePage.id ?? safePage}
							src={activePage.src}
							alt={activePage.label ?? `Page ${safePage}`}
							className={cn(k.page)}
							style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
						/>
					) : (
						<div className={cn(k.pageEmpty)}>No pages to display</div>
					)}
				</div>
			</div>

			{!isDesktop && (
				<Sheet side="left" open={thumbsOpen} onOpenChange={setThumbsOpen}>
					<SheetTitle>Pages</SheetTitle>
					<SheetBody className={cn(k.sheetThumbnails)}>
						{renderThumbnails(() => setThumbsOpen(false))}
					</SheetBody>
				</Sheet>
			)}
		</section>
	)
}
