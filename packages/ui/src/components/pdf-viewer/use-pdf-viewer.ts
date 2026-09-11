'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useCallback, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useMinBreakpoint } from '../../hooks'
import type { PdfViewerFit, PdfViewerMagnifierOptions, PdfViewerPage, PdfViewerZoom } from './types'
import { usePdfViewerDocument } from './use-pdf-viewer-document'
import { type ResolvedMagnifier, resolveMagnifier } from './use-pdf-viewer-magnifier'
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
	fit?: PdfViewerFit
	/** Whether the consumer supplied any highlight regions; gates the toolbar's visibility toggle. */
	hasHighlights?: boolean
	magnifier?: boolean | PdfViewerMagnifierOptions
	onHighlightsVisibleChange?: (visible: boolean) => void
	onMagnifierEnabledChange?: (enabled: boolean) => void
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
	rotate: () => void
	scale: PageScaleResult
	/** Source for download / print: the same-origin blob URL when loaded from `src`, else the raw `src`. */
	documentSrc: string | undefined
	filename: string | undefined
	loading: boolean
	error: Error | null
	/** True at the desktop breakpoint (≥ 1024px): pins the thumbnail sidebar instead of the Sheet. */
	isDesktop: boolean
	/**
	 * Desktop thumbnail sidebar open state; toggled from the toolbar.
	 *
	 * Mounts closed and opens once the document turns out to carry more than one page — a
	 * single page has nothing to navigate to and would spend the rail's width on a tile of the
	 * page already on screen. The reader's own toggle overrides that from the first press.
	 */
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	/**
	 * Whether the rail slides between open and closed.
	 *
	 * False until the reader presses the toggle. Where the rail starts is derived from the page
	 * count, and that count arrives with the document, so a rail that travelled on that change
	 * would announce the parse rather than the pages. The reader's press is a change they made,
	 * and it travels.
	 */
	sidebarAnimates: boolean
	/** Mobile thumbnail Sheet open state. */
	thumbsOpen: boolean
	setThumbsOpen: (open: boolean) => void
	/** How the page is scaled into the viewport before `zoom` applies. */
	fit: PdfViewerFit
	/** True when the consumer supplied any highlight regions. A boolean, never the array: the toolbar reads this, and an array identity changes every render. */
	hasHighlights: boolean
	/** Whether the highlight overlay is shown; toggled from the toolbar. Defaults to shown. */
	highlightsVisible: boolean
	setHighlightsVisible: (visible: boolean) => void
	/** True once the viewport and page are measured; gates the image from painting unsized. */
	visible: boolean
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
	rootRef: RefObject<HTMLElement | null>
	viewportRef: RefObject<HTMLDivElement | null>
	/**
	 * Resolved loupe settings, or `null` when there is no loupe to draw — either the consumer
	 * never asked for one, or the reader has switched it off.
	 */
	magnifierSettings: ResolvedMagnifier | null
	/**
	 * True when the consumer asked for a loupe. Gates the toolbar's toggle, the way
	 * {@link hasHighlights} gates the highlight one — and stays true while the loupe is off,
	 * which is exactly when the control has to remain there to switch it back on.
	 */
	magnifierAvailable: boolean
	/** Whether the loupe is switched on; toggled from the toolbar. Defaults to on. */
	magnifierOn: boolean
	setMagnifierOn: (on: boolean) => void
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
	fit = 'page',
	hasHighlights = false,
	magnifier: magnifierProp,
	onHighlightsVisibleChange,
	onMagnifierEnabledChange,
}: PdfViewerOptions): PdfViewerResult {
	/*
	 * The two chrome toggles report themselves.
	 *
	 * Through `useEffectEvent`, which is how this package raises an optional consumer callback
	 * out of a state change (`use-copy-button-state.ts` does the same for `onCopiedChange`):
	 * it always sees the latest render's props and its own identity never changes, so a
	 * consumer passing an inline arrow cannot destabilize the setters below — and through them
	 * the context value every region on the page reads.
	 *
	 * They are events rather than a controlled binding on purpose: the reader owns these two
	 * switches — nothing outside the viewer should be able to turn the highlights back on
	 * under them — while a consumer still needs to hear about it, because what it draws
	 * *beside* the viewer can be claiming a region is there to point at.
	 */
	const notifyHighlightsVisible = useEffectEvent((visible: boolean) => {
		onHighlightsVisibleChange?.(visible)
	})

	const notifyMagnifierEnabled = useEffectEvent((enabled: boolean) => {
		onMagnifierEnabledChange?.(enabled)
	})
	// What the consumer asked for, independent of whether the reader wants it right now.
	const magnifierOffered = useMemo(() => resolveMagnifier(magnifierProp), [magnifierProp])

	// Chrome, like the sidebar and the highlight toggle: nothing outside drives it, so it is
	// state rather than a prop. On by default — a consumer that passed the prop wants the loupe.
	const [magnifierOn, setMagnifierOnState] = useState(true)

	const setMagnifierOn = useCallback((on: boolean) => {
		setMagnifierOnState(on)

		notifyMagnifierEnabled(on)
	}, [])

	/*
	 * Withheld from the hook while it is off, which disables every interaction hook inside it
	 * rather than merely hiding the lens: a switched-off loupe should not be tracking the
	 * pointer across the page and re-rendering on every move.
	 */
	const magnifierSettings = magnifierOn ? magnifierOffered : null

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

	const isDesktop = useMinBreakpoint('lg')

	const { safePage, goToPage } = usePdfViewerPagination({
		total,
		page,
		defaultPage,
		onPageChange,
	})

	const [zoomValue, setZoomValue] = useState(defaultZoom)

	/*
	 * The thumbnail rail's own state, and `null` until the reader has an opinion.
	 *
	 * Nullable rather than a seeded boolean, because the answer depends on something no
	 * initializer can see: a one-page document has no navigation to offer, so pinning a rail
	 * beside it spends 224px of a panel that is often the narrower half of a split on a tile of
	 * the page already on screen — and the page count arrives with the document, since pdf.js
	 * has to parse the file first.
	 *
	 * **`> 1`, so it mounts closed.** The obvious reading of the rule — open unless the count
	 * is exactly one — is true while the count is still 0, which is every frame before the
	 * document resolves. So a one-page PDF opened the rail and then visibly shut it, which is
	 * the flicker this exists to avoid. Closed until something is known to be worth navigating
	 * costs a multi-page document a slide open instead, and that is the better of the two: it
	 * arrives with the pages it is for, rather than being taken away from a reader who was
	 * already looking at it.
	 *
	 * Derived rather than corrected by an effect, which would paint the wrong frame first
	 * whichever way the rule ran.
	 *
	 * The override is what makes deriving it safe: the moment the reader touches the toolbar's
	 * toggle their choice wins for good, so a rail they opened on a one-page document cannot be
	 * closed under them by a re-render, nor can a document swap reopen one they shut.
	 */
	const [sidebarChoice, setSidebarOpen] = useState<boolean | null>(null)

	const sidebarOpen = sidebarChoice ?? total > 1

	// Only a reader's press moves the rail; see `sidebarAnimates`.
	const sidebarAnimates = sidebarChoice !== null

	const [thumbsOpen, setThumbsOpen] = useState(false)

	// Chrome, like the two above: nothing outside drives it, so it is state rather than a
	// prop. Lives here (not with the overlay's own state) because the toolbar reads it, and
	// the toolbar sits outside the overlay's provider.
	const [highlightsVisible, setHighlightsVisibleState] = useState(true)

	const setHighlightsVisible = useCallback((visible: boolean) => {
		setHighlightsVisibleState(visible)

		notifyHighlightsVisible(visible)
	}, [])

	const rootRef = useRef<HTMLElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)

	const activePage = total > 0 ? pages[safePage - 1] : undefined

	// The document's own identity, not the resolved `pages`: the cache republishes
	// that array once per rasterized page, so keying on it reset the reader's
	// rotations — and re-ran every hook below — on each page of a streaming load.
	// `src` is stable across one; consumer-supplied pages carry their own identity.
	const { rotation, isTransposed, rotate } = usePdfViewerPageRotation(safePage, pagesProp ?? src)

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
		rotation,
		zoom: zoomValue,
		hasContent,
		fit,
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
			rotate,
			scale,
			fit,
			documentSrc,
			filename,
			loading,
			error,
			isDesktop,
			sidebarOpen,
			setSidebarOpen,
			sidebarAnimates,
			thumbsOpen,
			setThumbsOpen,
			hasHighlights,
			highlightsVisible,
			setHighlightsVisible,
			visible,
			onImageLoad,
			rootRef,
			viewportRef,
			magnifierSettings,
			magnifierAvailable: magnifierOffered !== null,
			magnifierOn,
			setMagnifierOn,
		}),
		[
			pages,
			total,
			activePage,
			safePage,
			goToPage,
			zoom,
			rotate,
			scale,
			fit,
			documentSrc,
			filename,
			loading,
			error,
			isDesktop,
			sidebarOpen,
			sidebarAnimates,
			thumbsOpen,
			hasHighlights,
			highlightsVisible,
			setHighlightsVisible,
			setMagnifierOn,
			visible,
			onImageLoad,
			magnifierSettings,
			magnifierOffered,
			magnifierOn,
		],
	)
}
