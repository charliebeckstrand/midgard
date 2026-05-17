'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useRef, useState } from 'react'
import { useMinWidth } from '../../hooks'
import type { PdfViewerPage, PdfViewerZoom } from './types'
import { usePdfViewerDocument } from './use-pdf-viewer-document'
import { usePdfViewerPageRotation } from './use-pdf-viewer-page-rotation'
import { type UsePageScaleResult, usePdfViewerPageScale } from './use-pdf-viewer-page-scale'
import { usePdfViewerPageSize } from './use-pdf-viewer-page-size'
import { usePdfViewerPagination } from './use-pdf-viewer-pagination'
import { usePdfViewerViewportSize } from './use-pdf-viewer-viewport-size'

export type UsePdfViewerInput = {
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

export type UsePdfViewerResult = {
	pages: PdfViewerPage[]
	total: number
	activePage: PdfViewerPage | undefined
	safePage: number
	goToPage: (page: number) => void
	zoom: PdfViewerZoom
	rotation: number
	rotate: () => void
	scale: UsePageScaleResult
	documentSrc: string | undefined
	filename: string | undefined
	isLoading: boolean
	error: Error | null
	isDesktop: boolean
	thumbsOpen: boolean
	setThumbsOpen: (open: boolean) => void
	visible: boolean
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
	rootRef: RefObject<HTMLElement | null>
	viewportRef: RefObject<HTMLDivElement | null>
}

export function usePdfViewer({
	pages: pagesProp,
	src,
	filename,
	page,
	defaultPage = 1,
	onPageChange,
	defaultZoom = 1,
	zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 3],
	defaultRotation = 0,
}: UsePdfViewerInput): UsePdfViewerResult {
	const shouldLoadFromSrc = !pagesProp && !!src

	const {
		pages: loadedPages,
		documentUrl,
		isLoading,
		error,
	} = usePdfViewerDocument(shouldLoadFromSrc ? src : undefined)

	const pages = pagesProp ?? loadedPages

	// Prefer the same-origin blob URL from the hook so download/print stay in-page.
	// Falling back to the original `src` works for same-origin docs but will navigate
	// to the browser's PDF viewer for cross-origin docs.
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

	// `isTransposed` invalidates the viewport measurement so it re-runs synchronously
	// on rotation flip, before paint — instead of waiting a frame for ResizeObserver.
	const viewportSize = usePdfViewerViewportSize(viewportRef, isTransposed)

	// Aspect ratio drives the viewport height. US Letter (8.5 × 11) is the pre-load
	// fallback — close to most documents and stable while the first page resolves.
	// Leave it unset when there's nothing to display so the viewer can collapse.
	const hasContent = !!src || total > 0

	const scale = usePdfViewerPageScale({
		viewportSize,
		pageSize,
		isTransposed,
		zoom: zoomValue,
		hasContent,
	})

	return {
		pages,
		total,
		activePage,
		safePage,
		goToPage,
		zoom: { value: zoomValue, setValue: setZoomValue, levels: zoomLevels },
		rotation,
		rotate,
		scale,
		documentSrc,
		filename,
		isLoading,
		error,
		isDesktop,
		thumbsOpen,
		setThumbsOpen,
		visible: !!(viewportSize && pageSize),
		onImageLoad,
		rootRef,
		viewportRef,
	}
}
