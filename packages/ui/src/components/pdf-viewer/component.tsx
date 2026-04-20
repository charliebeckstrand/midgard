'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useIsDesktop } from '../../hooks'
import { PdfViewerThumbnails } from './thumbnails'
import { PdfViewerToolbar } from './toolbar'
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
	const [thumbsOpen, setThumbsOpen] = useState(false)

	const rootRef = useRef<HTMLElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)

	const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null)
	const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

	const safePage = total > 0 ? clamp(currentPage, 1, total) : 0

	const activePage = total > 0 ? pages[safePage - 1] : undefined

	useLayoutEffect(() => {
		const el = viewportRef.current

		if (!el) return

		const measure = () => {
			const styles = window.getComputedStyle(el)

			const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
			const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)

			setViewportSize({
				width: el.clientWidth - padX,
				height: el.clientHeight - padY,
			})
		}

		measure()

		const observer = new ResizeObserver(() => measure())

		observer.observe(el)

		return () => observer.disconnect()
	}, [])

	const normalizedRotation = ((rotation % 360) + 360) % 360

	const isSideways = normalizedRotation === 90 || normalizedRotation === 270

	const fitScale = useMemo(() => {
		if (!viewportSize || !naturalSize) return 1

		const visW = isSideways ? naturalSize.height : naturalSize.width
		const visH = isSideways ? naturalSize.width : naturalSize.height

		if (visW === 0 || visH === 0) return 1

		return Math.min(viewportSize.width / visW, viewportSize.height / visH)
	}, [viewportSize, naturalSize, isSideways])

	const scale = fitScale * zoom

	const imageW = naturalSize ? naturalSize.width * scale : undefined
	const imageH = naturalSize ? naturalSize.height * scale : undefined

	const frameW = isSideways ? imageH : imageW
	const frameH = isSideways ? imageW : imageH

	const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
		const img = event.currentTarget

		setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
	}

	const goToPage = useCallback(
		(next: number) => {
			if (total === 0) return

			setCurrentPage(clamp(Math.round(next), 1, total))
		},
		[setCurrentPage, total],
	)

	return (
		<section
			ref={rootRef}
			data-slot="pdf-viewer"
			aria-label={ariaLabel}
			className={cn(k.base, className)}
		>
			<PdfViewerToolbar
				pages={pages}
				total={total}
				safePage={safePage}
				goToPage={goToPage}
				zoom={zoom}
				setZoom={setZoom}
				minZoom={minZoom}
				maxZoom={maxZoom}
				zoomStep={zoomStep}
				setRotation={setRotation}
				src={src}
				filename={filename}
				isDesktop={isDesktop}
				thumbsOpen={thumbsOpen}
				onThumbsOpen={() => setThumbsOpen(true)}
			/>

			<div className={cn(k.body)}>
				<PdfViewerThumbnails
					pages={pages}
					safePage={safePage}
					goToPage={goToPage}
					isDesktop={isDesktop}
					thumbsOpen={thumbsOpen}
					onThumbsOpenChange={setThumbsOpen}
					container={rootRef.current}
				/>

				<div ref={viewportRef} data-slot="pdf-viewer-viewport" className={cn(k.viewport)}>
					{activePage ? (
						<div
							data-slot="pdf-viewer-page-frame"
							className={cn(k.pageFrame)}
							style={{ width: frameW, height: frameH }}
						>
							<img
								key={activePage.id ?? safePage}
								src={activePage.src}
								alt={activePage.label ?? `Page ${safePage}`}
								className={cn(k.page)}
								style={{
									width: imageW,
									height: imageH,
									transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
									visibility: viewportSize && naturalSize ? 'visible' : 'hidden',
								}}
								onLoad={handleImageLoad}
							/>
						</div>
					) : (
						<div className={cn(k.pageEmpty)}>No pages to display</div>
					)}
				</div>
			</div>
		</section>
	)
}
