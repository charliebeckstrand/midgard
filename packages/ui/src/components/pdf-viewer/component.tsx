'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useMinWidth } from '../../hooks'
import { PdfViewerThumbnails } from './thumbnails'
import { PdfViewerToolbar } from './toolbar'
import { usePdfDocument } from './use-pdf-document'
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
	/** Intrinsic width in pixels. Used to size the viewport before the image loads. */
	width?: number
	/** Intrinsic height in pixels. Used to size the viewport before the image loads. */
	height?: number
}

export type PdfViewerProps = {
	/**
	 * Pre-rendered page images, in order.
	 * When omitted and `src` is provided, pages are rendered from the PDF via pdf.js.
	 */
	pages?: PdfViewerPage[]
	/**
	 * Source URL for the PDF document. Drives the viewport when `pages` is not provided,
	 * and powers the download and print toolbar actions.
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
	pages: pagesProp,
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
	const shouldLoadFromSrc = !pagesProp && !!src

	const {
		pages: loadedPages,
		documentUrl,
		isLoading,
		error,
	} = usePdfDocument(shouldLoadFromSrc ? src : undefined)

	const pages = pagesProp ?? loadedPages

	// Prefer the same-origin blob URL from the hook so download/print stay in-page.
	// Falling back to the original `src` works for same-origin docs but will navigate
	// to the browser's PDF viewer for cross-origin docs.
	const documentSrc = documentUrl ?? src

	const total = pages.length

	const isDesktop = useMinWidth(1024)

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

	// Prefer dimensions supplied by the caller (or the pdf.js hook) so the viewport
	// can establish its aspect ratio before the image paints. Fall back to the
	// image's natural size, then US Letter (8.5 × 11) for the pre-load state.
	const pageSize =
		activePage?.width && activePage.height
			? { width: activePage.width, height: activePage.height }
			: naturalSize

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
		if (!viewportSize || !pageSize) return 1

		const visW = isSideways ? pageSize.height : pageSize.width
		const visH = isSideways ? pageSize.width : pageSize.height

		if (visW === 0 || visH === 0) return 1

		return Math.min(viewportSize.width / visW, viewportSize.height / visH)
	}, [viewportSize, pageSize, isSideways])

	const scale = fitScale * zoom

	const imageW = pageSize ? pageSize.width * scale : undefined
	const imageH = pageSize ? pageSize.height * scale : undefined

	const frameW = isSideways ? imageH : imageW
	const frameH = isSideways ? imageW : imageH

	// Aspect ratio drives the viewport height. US Letter (8.5 × 11) is the pre-load
	// fallback — close to most documents and stable while the first page resolves.
	// Leave it unset when there's nothing to display so the viewer can collapse.
	const hasContent = !!src || total > 0

	const aspectRatio = !hasContent
		? undefined
		: pageSize
			? isSideways
				? `${pageSize.height} / ${pageSize.width}`
				: `${pageSize.width} / ${pageSize.height}`
			: '8.5 / 11'

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
				src={documentSrc}
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
					isLoading={isLoading}
					isDesktop={isDesktop}
					thumbsOpen={thumbsOpen}
					onThumbsOpenChange={setThumbsOpen}
					container={rootRef.current}
				/>

				<div
					ref={viewportRef}
					data-slot="pdf-viewer-viewport"
					className={cn(k.viewport)}
					style={{ aspectRatio }}
				>
					{activePage && !isLoading ? (
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
									visibility: viewportSize && pageSize ? 'visible' : 'hidden',
								}}
								onLoad={handleImageLoad}
							/>
						</div>
					) : error ? (
						<div className={cn(k.pageEmpty)}>Failed to load PDF: {error.message}</div>
					) : isLoading ? (
						<output
							data-slot="pdf-viewer-page-frame"
							aria-label="Loading PDF"
							className={cn(k.pagePlaceholder)}
						/>
					) : (
						<div className={cn(k.pageEmpty)}>No pages to display</div>
					)}
				</div>
			</div>
		</section>
	)
}
