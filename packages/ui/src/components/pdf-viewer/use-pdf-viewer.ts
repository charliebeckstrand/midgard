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

export type PdfViewerResult = {
	pages: PdfViewerPage[]
	total: number
	activePage: PdfViewerPage | undefined
	safePage: number
	goToPage: (page: number) => void
	zoom: PdfViewerZoom
	rotation: number
	rotate: () => void
	scale: PageScaleResult
	documentSrc: string | undefined
	filename: string | undefined
	loading: boolean
	error: Error | null
	isDesktop: boolean
	thumbsOpen: boolean
	setThumbsOpen: (open: boolean) => void
	visible: boolean
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
	rootRef: RefObject<HTMLElement | null>
	viewportRef: RefObject<HTMLDivElement | null>
}

const DEFAULT_ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

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
	const [thumbsOpen, setThumbsOpen] = useState(false)

	const rootRef = useRef<HTMLElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)

	const activePage = total > 0 ? pages[safePage - 1] : undefined

	const { rotation, isTransposed, rotate } = usePdfViewerPageRotation(safePage, defaultRotation)

	const { pageSize, onImageLoad } = usePdfViewerPageSize(activePage, safePage)

	// Pass `isTransposed` as the invalidation key so the viewport re-measures
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

	// Memoized so PdfViewerContext value identity is stable across renders that
	// don't touch its fields.
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
			thumbsOpen,
			visible,
			onImageLoad,
		],
	)
}
