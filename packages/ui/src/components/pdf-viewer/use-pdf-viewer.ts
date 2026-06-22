'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useMinWidth } from '../../hooks'
import type { PdfViewerPage, PdfViewerZoom } from './types'
import { usePdfViewerDocument } from './use-pdf-viewer-document'
import { usePdfViewerPageRotation } from './use-pdf-viewer-page-rotation'
import { type PageScaleResult, usePdfViewerPageScale } from './use-pdf-viewer-page-scale'
import { usePdfViewerPageSize } from './use-pdf-viewer-page-size'
import { usePdfViewerPagination } from './use-pdf-viewer-pagination'
import { usePdfViewerViewportSize } from './use-pdf-viewer-viewport-size'

/** Inputs to {@link usePdfViewer}; mirrors the consumer-facing {@link PdfViewerProps} minus presentation (`className`, `aria-label`). @internal */
type PdfViewerOptions = {
	pages?: PdfViewerPage[]
	src?: string
	filename?: string
	page?: number
	defaultPage?: number
	onPageChange?: (page: number) => void
	defaultZoom?: number
	zoomLevels?: number[]
	defaultRotation?: number
}

/** The viewer's full derived state, provided through {@link PdfViewerContext} to every sub-component. @internal */
export type PdfViewerResult = {
	/** Resolved pages: consumer `pages`, or the set rasterized from `src`. */
	pages: PdfViewerPage[]
	total: number
	activePage: PdfViewerPage | undefined
	/** Current page clamped to `[1, total]`, or `0` when empty. */
	safePage: number
	goToPage: (page: number) => void
	zoom: PdfViewerZoom
	/** Raw rotation in degrees for the active page; may be ≥ 360. */
	rotation: number
	rotate: () => void
	scale: PageScaleResult
	/** Source for download / print: the same-origin blob URL when loaded from `src`, else the raw `src`. */
	documentSrc: string | undefined
	filename: string | undefined
	loading: boolean
	error: Error | null
	/** True at the desktop breakpoint (≥ 1024px): pins the thumbnail sidebar instead of the Sheet. */
	isDesktop: boolean
	/** Desktop thumbnail sidebar open state; toggled from the toolbar. Defaults to open. */
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	/** Mobile thumbnail Sheet open state. */
	thumbsOpen: boolean
	setThumbsOpen: (open: boolean) => void
	/** True once the viewport and page are measured; gates the image from painting unsized. */
	visible: boolean
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
	rootRef: RefObject<HTMLElement | null>
	viewportRef: RefObject<HTMLDivElement | null>
}

const DEFAULT_ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

/**
 * Composes the PDF viewer's state — document loading, pagination, per-page
 * rotation, zoom, and the measured viewport/page scale — into one memoized
 * value for {@link PdfViewerContext}.
 *
 * @returns The {@link PdfViewerResult} consumed by every viewer sub-component.
 * @remarks When `pages` is omitted but `src` is set, pages are rasterized
 * asynchronously via pdf.js ({@link usePdfViewerDocument}); `loading` and
 * `error` track that lifecycle.
 * @internal
 */
export function usePdfViewer({
	pages: pagesProp,
	src,
	filename,
	page,
	defaultPage = 1,
	onPageChange,
	defaultZoom = 1,
	zoomLevels = DEFAULT_ZOOM_LEVELS,
	defaultRotation = 0,
}: PdfViewerOptions): PdfViewerResult {
	const shouldLoadFromSrc = !pagesProp && !!src

	const {
		pages: loadedPages,
		documentUrl,
		loading,
		error,
	} = usePdfViewerDocument(shouldLoadFromSrc ? src : undefined)

	const pages = pagesProp ?? loadedPages

	// Prefer the same-origin blob URL from the hook for download/print.
	// Falls back to `src` for same-origin docs; cross-origin docs open in
	// the browser's PDF viewer.
	const documentSrc = documentUrl ?? src

	const total = pages.length

	const isDesktop = useMinWidth(1024)

	const { safePage, goToPage } = usePdfViewerPagination({
		total,
		page,
		defaultPage,
		onPageChange,
	})

	const [zoomValue, setZoomValue] = useState(defaultZoom)
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [thumbsOpen, setThumbsOpen] = useState(false)

	const rootRef = useRef<HTMLElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)

	const activePage = total > 0 ? pages[safePage - 1] : undefined

	// `pages` is the resolved document (consumer `pages` or the src-loaded set);
	// its identity changes on a document swap, resetting per-page rotations.
	const { rotation, isTransposed, rotate } = usePdfViewerPageRotation(
		safePage,
		defaultRotation,
		pages,
	)

	const { pageSize, onImageLoad } = usePdfViewerPageSize(activePage, safePage)

	// `isTransposed` is the invalidation key; the viewport re-measures
	// synchronously on rotation flip, before paint.
	const viewportSize = usePdfViewerViewportSize(viewportRef, isTransposed)

	// Aspect ratio drives the viewport height. US Letter (8.5 × 11) is the
	// pre-load fallback. Unset when there is no content to display.
	const hasContent = !!src || total > 0

	const scale = usePdfViewerPageScale({
		viewportSize,
		pageSize,
		isTransposed,
		zoom: zoomValue,
		hasContent,
	})

	const zoom = useMemo<PdfViewerZoom>(
		() => ({ value: zoomValue, setValue: setZoomValue, levels: zoomLevels }),
		[zoomValue, zoomLevels],
	)

	const visible = !!(viewportSize && pageSize)

	// Memoized; PdfViewerContext value identity stays stable across renders
	// that don't touch its fields.
	return useMemo<PdfViewerResult>(
		() => ({
			pages,
			total,
			activePage,
			safePage,
			goToPage,
			zoom,
			rotation,
			rotate,
			scale,
			documentSrc,
			filename,
			loading,
			error,
			isDesktop,
			sidebarOpen,
			setSidebarOpen,
			thumbsOpen,
			setThumbsOpen,
			visible,
			onImageLoad,
			rootRef,
			viewportRef,
		}),
		[
			pages,
			total,
			activePage,
			safePage,
			goToPage,
			zoom,
			rotation,
			rotate,
			scale,
			documentSrc,
			filename,
			loading,
			error,
			isDesktop,
			sidebarOpen,
			thumbsOpen,
			visible,
			onImageLoad,
		],
	)
}
