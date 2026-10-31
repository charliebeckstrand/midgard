'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { type OffcanvasLayout, useOffcanvas, usePrefersReducedMotion } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { adaptive, mapResponsive, type Responsive } from '../../types'
import { resolveDownloadName } from './pdf-viewer-utilities'
import type {
	PdfViewerFit,
	PdfViewerMagnifierMode,
	PdfViewerMagnifierOptions,
	PdfViewerMagnifierState,
	PdfViewerPage,
	PdfViewerSlot,
	PdfViewerThumbnailLayout,
	PdfViewerZoom,
} from './types'
import { usePdfViewerDocument, usePdfViewerDocumentFocus } from './use-pdf-viewer-document'
import {
	currentMagnifierChoice,
	type MagnifierChoice,
	type ResolvedMagnifier,
	resolveMagnifier,
	resolveMagnifierChoice,
} from './use-pdf-viewer-magnifier'
import { usePdfViewerPageRotation } from './use-pdf-viewer-page-rotation'
import { type PageScaleResult, usePdfViewerPageScale } from './use-pdf-viewer-page-scale'
import { usePdfViewerPageSize } from './use-pdf-viewer-page-size'
import { usePdfViewerPagination } from './use-pdf-viewer-pagination'
import { usePdfViewerViewportSize } from './use-pdf-viewer-viewport-size'

/** What a load that opened a document with no page reports. @internal */
const EMPTY_DOCUMENT = new Error('The document has no pages.')

/**
 * How a settled snapshot reports: the error to raise, `null` for a clean load, or
 * `'pending'` where nothing has settled yet.
 *
 * A src nothing is resident for publishes the frozen empty snapshot, which is
 * shape-identical to a load that rasterized nothing. `started` is what parts them.
 *
 * Pages come before the error. A snapshot with pages is a document that opened, and the
 * open is the load. An error beside them is a failure after the open, which the viewer
 * shows and which does not call `onError`.
 *
 * @internal
 */
function documentSettle(
	error: Error | null,
	pageCount: number,
	started: boolean,
): Error | null | 'pending' {
	if (pageCount > 0) return null

	if (error) return error

	return started ? EMPTY_DOCUMENT : 'pending'
}

/**
 * The report that a settle owes, or `undefined` when `prev` already made it.
 *
 * @remarks A load that the viewer already reported keeps its report. A failure after the open
 * does not also call `onError`.
 * @internal
 */
function nextReport(
	settled: Error | null,
	src: string | undefined,
	prev: string | undefined,
): string | undefined {
	if (settled && prev === `load:${src}`) return undefined

	const reported = `${settled === null ? 'load' : 'error'}:${src}`

	return reported === prev ? undefined : reported
}

/**
 * Whether two page sets show the same document: the same length, and the same `id` and
 * `src` at each index.
 *
 * @internal
 */
function samePages(prev: PdfViewerPage[] | undefined, next: PdfViewerPage[] | undefined) {
	if (prev === next) return true

	if (!prev || !next || prev.length !== next.length) return false

	return prev.every((entry, index) => {
		const other = next[index]

		return entry.id === other?.id && entry.src === other?.src
	})
}

/**
 * The identity of the viewer's document, for the hooks that reset per document.
 *
 * Consumer `pages` keep their previous reference while {@link samePages} holds. An inline
 * array literal therefore keeps one identity across parent renders. With no `pages`, the
 * key is `src`, which stays stable while the cache publishes each rasterized page.
 *
 * @internal
 */
function useDocumentKey(pagesProp: PdfViewerPage[] | undefined, src: string | undefined) {
	const [held, setHeld] = useState(pagesProp)

	const same = held === pagesProp || samePages(held, pagesProp)

	// A change of content adjusts the held pages during render. React then renders
	// again at once, before it commits.
	if (!same) setHeld(pagesProp)

	return (same ? held : pagesProp) ?? src
}

/** Inputs to {@link usePdfViewer}; mirrors the consumer-facing {@link PdfViewerProps} minus presentation (`className`, `aria-label`). @internal */
type PdfViewerOptions = {
	pages?: PdfViewerPage[]
	src?: string
	filename?: string
	page?: number
	defaultPage?: number
	onPageChange?: (page: number) => void
	onLoad?: (pageCount: number) => void
	onError?: (error: Error) => void
	defaultZoom?: number
	zoomLevels?: number[]
	fit?: PdfViewerFit
	thumbnails?: Responsive<PdfViewerThumbnailLayout>
	/** Whether the consumer supplied any highlight regions; gates the toolbar's visibility toggle. */
	hasHighlights?: boolean
	magnifier?: boolean | PdfViewerMagnifierOptions
	onHighlightsVisibleChange?: (visible: boolean) => void
	onMagnifierChange?: (state: PdfViewerMagnifierState) => void
}

/** The viewer's full derived state, provided through {@link PdfViewerContext} to every sub-component. @internal */
export type PdfViewerResult = {
	/**
	 * Resolved pages: consumer `pages`, or the slots of the `src` document. The slots arrive
	 * when the document opens, and a slot whose page has not rendered has an empty `src`.
	 */
	pages: PdfViewerSlot[]
	total: number
	activePage: PdfViewerSlot | undefined
	/** Current page clamped to `[1, total]`, or `0` when empty. */
	safePage: number
	goToPage: (page: number) => void
	zoom: PdfViewerZoom
	rotate: () => void
	scale: PageScaleResult
	/** Source for download / print: the same-origin blob URL when loaded from `src`, else the raw `src`. */
	documentSrc: string | undefined
	/**
	 * Names the thumbnails that the rail shows, as 0-based indices, so the `src` path renders
	 * only those. `null` for pages that a caller supplies.
	 */
	showThumbnails: ((indices: number[]) => void) | null
	/**
	 * The download name: the `filename` of the consumer, else a name from `src` when the
	 * download goes through the blob URL, which has no name of its own.
	 */
	filename: string | undefined
	loading: boolean
	/**
	 * True while a `src` load has not started yet. The viewport paints its loading placeholder
	 * for it, so a cold `src` never shows the empty state first.
	 */
	pending: boolean
	error: Error | null
	/** True where `thumbnails` is `'rail'`: pins the thumbnail sidebar instead of the Sheet. */
	railed: boolean
	/** `thumbnails` as an offcanvas layout, for the `offcanvas` axis of the kata. */
	offcanvas: Responsive<OffcanvasLayout>
	/**
	 * Thumbnail rail open state; toggled from the toolbar.
	 *
	 * Starts open for each document, also while the document loads, so the first paint has
	 * the layout of the loaded viewer. The toggle of the reader changes it.
	 */
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	/**
	 * Whether the rail slides between open and closed.
	 *
	 * False until the reader presses the toggle. The rail is there from the first paint, and
	 * only a press of the reader moves it. The reader's press is a change they made, and it
	 * travels.
	 *
	 * False under `prefers-reduced-motion` too, which is what makes this one fact rather than
	 * two. The rail carries the transition only while this is true. It is therefore also the
	 * answer to "will a `transitionend` arrive", the question the thumbnail rail's mount
	 * hold asks.
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
	/** The viewer's root element, once mounted. State, not a ref: the thumbnail Sheet portals into it, so a render reads it. */
	root: HTMLElement | null
	/** The callback ref that mounts {@link root}. */
	setRoot: (node: HTMLElement | null) => void
	viewportRef: RefObject<HTMLDivElement | null>
	/**
	 * Resolved loupe settings, or `null` when there is no loupe to draw. Either the consumer
	 * never asked for one, or the reader has switched it off.
	 */
	magnifierSettings: ResolvedMagnifier | null
	/** Whether the loupe is switched on. Defaults to on. */
	magnifierOn: boolean
	setMagnifierOn: (on: boolean) => void
	/**
	 * How the toolbar's magnifier control behaves: a switch, or the control that opens
	 * {@link PdfViewerMagnifierSettings}. It is `null` where the consumer asked for no loupe,
	 * which is what keeps both controls out of the bar.
	 *
	 * @remarks Nullable rather than a second `magnifierAvailable` boolean beside it: the two
	 * were only ever read together, and the mode already says everything the boolean did. It
	 * survives the loupe being switched off, which is exactly when the control has to stay in
	 * the bar to switch it back on.
	 */
	magnifierMode: PdfViewerMagnifierMode | null
	/**
	 * The loupe's settings in the named steps the config dialog offers, or `null` when the
	 * consumer never asked for a loupe.
	 *
	 * @remarks Distinct from {@link magnifierSettings}, which is the same three settings as
	 * numbers and goes dark the moment the reader switches the loupe off. The dialog reads
	 * this one, because it has to keep showing what the settings are while the loupe is off.
	 */
	magnifierChoice: MagnifierChoice | null
	setMagnifierChoice: (choice: MagnifierChoice) => void
}

const DEFAULT_ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

/** The default `thumbnails` of a `PdfViewer`: a sheet on a compact or a medium viewport, and a rail when expanded. */
export const PDF_VIEWER_THUMBNAILS = adaptive({
	compact: 'sheet',
	expanded: 'rail',
}) satisfies Responsive<PdfViewerThumbnailLayout>

/** The offcanvas layout of a `thumbnails` value: the rail is pinned `inline`, and the Sheet is the `drawer`. */
const toOffcanvas = (layout: PdfViewerThumbnailLayout): OffcanvasLayout =>
	layout === 'rail' ? 'inline' : 'drawer'

/**
 * Composes the PDF viewer's state (document loading, pagination, per-page
 * rotation, zoom, and the measured viewport/page scale) into one memoized
 * value for {@link PdfViewerContext}.
 *
 * @returns The {@link PdfViewerResult} consumed by every viewer sub-component.
 * @remarks When `pages` is omitted but `src` is set, pages are rasterized
 * asynchronously via pdf.js ({@link usePdfViewerDocument}). The page count
 * is whole when the document opens, and `loading` is true until then. The
 * active page renders first, then its neighbors. `error` tracks the load.
 * @internal
 */
export function usePdfViewer({
	pages: pagesProp,
	src,
	filename,
	page,
	defaultPage = 1,
	onPageChange,
	onLoad,
	onError,
	defaultZoom = 1,
	zoomLevels = DEFAULT_ZOOM_LEVELS,
	fit = 'page',
	thumbnails = PDF_VIEWER_THUMBNAILS,
	hasHighlights = false,
	magnifier: magnifierProp,
	onHighlightsVisibleChange,
	onMagnifierChange,
}: PdfViewerOptions): PdfViewerResult {
	/*
	 * The chrome the reader owns reports itself: the highlight overlay here, the loupe below.
	 *
	 * Through `useEffectEvent`, which is how this package raises an optional consumer callback
	 * out of a state change. `use-copy-button-state.ts` does the same for `onCopiedChange`. It
	 * always sees the latest render's props, and its own identity never changes. A consumer
	 * passing an inline arrow therefore cannot destabilize the setters below, nor the context
	 * value every region on the page reads.
	 *
	 * They are events rather than a controlled binding on purpose. The reader owns these
	 * switches, and nothing outside the viewer can turn the highlights back on under them. A
	 * consumer still needs to hear about it. What it draws *beside* the viewer can be claiming
	 * a region is there to point at.
	 */
	const notifyHighlightsVisible = useEffectEvent((visible: boolean) => {
		onHighlightsVisibleChange?.(visible)
	})

	// The document lifecycle reports the same way, for the same reason: the load
	// settles outside any call site this hook runs, so the report watches the
	// committed snapshot instead.
	const notifyLoad = useEffectEvent((pageCount: number) => {
		onLoad?.(pageCount)
	})

	const notifyError = useEffectEvent((error: Error) => {
		onError?.(error)
	})

	/*
	 * What the consumer asked for, independent of what the reader wants right now.
	 *
	 * Keyed on the settings rather than on the object that carries them. `magnifier={{ mode:
	 * 'config' }}` written inline is a new object on every render of the consumer. Config mode
	 * makes an object the common shape, rather than the exception a different power used to
	 * be. Keyed on identity, that rebuilt the resolved settings every render. It also rebuilt
	 * the memoized context value the toolbar, the thumbnail rail and every region on the page
	 * read. That value is the one guarantee this hook's final memo exists to make.
	 */
	const magnifierAsked = !!magnifierProp

	const {
		mode: magnifierModeProp,
		enabled: magnifierEnabled = true,
		zoom: magnifierZoom,
		size: magnifierSize,
		delay: magnifierDelay,
	}: PdfViewerMagnifierOptions = typeof magnifierProp === 'object' ? magnifierProp : {}

	const magnifierOffered = useMemo(
		() =>
			magnifierAsked
				? resolveMagnifierChoice({
						zoom: magnifierZoom,
						size: magnifierSize,
						delay: magnifierDelay,
					})
				: null,
		[magnifierAsked, magnifierZoom, magnifierSize, magnifierDelay],
	)

	/*
	 * The switch of the reader, and `null` until they press it.
	 *
	 * The same rule as the three settings below. Until the reader presses the switch, the
	 * `enabled` of the prop is the answer, so a stored state comes back as the reader left it.
	 * On by default, because a consumer that passed the prop wants the loupe.
	 */
	const [magnifierOnState, setMagnifierOnState] = useState<boolean | null>(null)

	const magnifierOn = magnifierOnState ?? magnifierEnabled

	/*
	 * The reader's own settings, and `null` until they have one.
	 *
	 * The same nullable shape as `sidebarChoice` below. Until the reader opens the dialog and
	 * picks something, the consumer's prop is the answer. A consumer that
	 * changes it keeps driving the loupe. From the first press in the dialog the reader's
	 * choice holds, and no re-render can take it back from them.
	 */
	const [magnifierChoiceState, setMagnifierChoiceState] = useState<MagnifierChoice | null>(null)

	// The choice of the reader stays in state while the prop is withdrawn, so a prop offered
	// again brings it back.
	const magnifierChoice = currentMagnifierChoice(magnifierOffered, magnifierChoiceState)

	/*
	 * One report for the whole of what the reader owns, rather than one per switch.
	 *
	 * Through `useEffectEvent` for the reason the highlight notifier above uses it, and for a
	 * second one. It reads `magnifierOn` and `magnifierChoice` off the latest render. The two
	 * setters below can therefore close over neither, and keep the stable identities the
	 * context memo needs. `next` is spread last. The setter that raises this knows its own new
	 * value, while the render this reads from still holds the old one.
	 */
	const notifyMagnifier = useEffectEvent((next: Partial<PdfViewerMagnifierState>) => {
		if (!magnifierChoice) return

		onMagnifierChange?.({ enabled: magnifierOn, ...magnifierChoice, ...next })
	})

	const setMagnifierOn = useStableEvent((on: boolean) => {
		setMagnifierOnState(on)

		notifyMagnifier({ enabled: on })
	})

	const setMagnifierChoice = useStableEvent((choice: MagnifierChoice) => {
		setMagnifierChoiceState(choice)

		notifyMagnifier(choice)
	})

	const shouldLoadFromSrc = !pagesProp && !!src

	const {
		pages: loadedPages,
		documentUrl,
		loading,
		pending,
		error,
	} = usePdfViewerDocument(shouldLoadFromSrc ? src : undefined)

	const pages = pagesProp ?? loadedPages

	/*
	 * One report for each settle of one `src`.
	 *
	 * The load resolves into a module cache, not at a call site this hook runs.
	 * There is no line to hang the report on. The committed snapshot is the only
	 * honest source. A cache hit reports on the first render, which is correct: the
	 * document IS ready. A viewer given `pages` directly loads nothing and reports
	 * nothing.
	 *
	 * The ref keys on the src AND what it reported, not on the src alone. A failure
	 * is published to the subscribers standing at the time and never cached, so the
	 * next mount retries the same src. This viewer, still subscribed, must report
	 * the success that retry produces. It must not hold its error banner over a
	 * document rendering beside it.
	 *
	 * The load is the open. The slots of every page arrive when the document
	 * opens, while the pages still render, so `onLoad` reports then with the full
	 * page count. A failure after the open does not undo it: the viewer shows the
	 * failure, and `onError` stays for a document that never opened.
	 *
	 * A settle with no pages and no error is a settle all the same: a document
	 * that opened with no page. It reports as a failure. Exactly one of the two
	 * callbacks owes an answer for each src.
	 */
	const reportedRef = useRef<string | undefined>(undefined)

	// A src nothing is resident for publishes the frozen empty snapshot, which is
	// shape-identical to a load that rasterized nothing. They part on whether a load
	// was ever seen in flight for this src; a cache hit skips it and arrives with
	// pages, which needs no flag.
	const startedRef = useRef<string | undefined>(undefined)

	useEffect(() => {
		if (!shouldLoadFromSrc) return

		if (loading) startedRef.current = src

		if (loading && loadedPages.length === 0) return

		const settled = documentSettle(error, loadedPages.length, startedRef.current === src)

		if (settled === 'pending') return

		const reported = nextReport(settled, src, reportedRef.current)

		if (!reported) return

		reportedRef.current = reported

		if (settled) notifyError(settled)
		else notifyLoad(loadedPages.length)
	}, [shouldLoadFromSrc, loading, error, loadedPages, src])

	// Prefer the same-origin blob URL from the hook for download/print.
	// Falls back to `src` for same-origin docs; cross-origin docs open in
	// the browser's PDF viewer.
	const documentSrc = documentUrl ?? src

	const downloadName = resolveDownloadName(filename, src, documentUrl)

	const total = pages.length

	const { safePage, goToPage } = usePdfViewerPagination({
		total,
		page,
		defaultPage,
		onPageChange,
	})

	const [zoomValue, setZoomValue] = useState(defaultZoom)

	/*
	 * The choice of the reader for the thumbnail rail, and `null` until they press the toggle.
	 *
	 * The rail starts open for each document, and the page count does not change that. The
	 * count arrives with the document, because pdf.js must parse the file first. The server
	 * paint and the frames before the parse have no count. A rail that opened at the count
	 * narrowed the page, and the whole viewer became shorter after the first paint. A rail
	 * that closed at the count of a one-page document made the viewer taller. The first paint
	 * is therefore the settled layout only when the count has no part in it.
	 *
	 * A one-page document thus has a rail with one tile. The reader can close it.
	 *
	 * From the first press, the choice of the reader holds. A document swap cannot open a
	 * rail that they closed.
	 */
	const [sidebarChoice, setSidebarOpen] = useState<boolean | null>(null)

	const sidebarOpen = sidebarChoice ?? true

	/*
	 * Only a reader's press moves the rail, and only where movement is wanted at all.
	 *
	 * It is read live through the media query, rather than through motion's
	 * `useReducedMotion`, which samples once at mount. A reader who turns reduced motion on
	 * mid-session would otherwise leave the rail carrying a transition whose `transitionend`
	 * the CSS had stopped sending. The rail's mount hold would then wait for it forever.
	 * `use-grid-reveal-hold.ts` documents the same trap.
	 */
	const reducedMotion = usePrefersReducedMotion()

	const sidebarAnimates = sidebarChoice !== null && !reducedMotion

	// The thumbnail Sheet is an offcanvas drawer of the rail. Where the layout is `rail`, the
	// hook keeps the Sheet closed, so it does not open again without a press when the viewport
	// narrows (a tablet rotation).
	const thumbnailsLayout = useMemo(() => mapResponsive(thumbnails, toOffcanvas), [thumbnails])

	const {
		open: thumbsOpen,
		setOpen: setThumbsOpen,
		layout: offcanvas,
		inline: railed,
	} = useOffcanvas({ layout: thumbnailsLayout })

	// Chrome, like the two above: nothing outside drives it, so it is state rather than a
	// prop. Lives here (not with the overlay's own state) because the toolbar reads it, and
	// the toolbar sits outside the overlay's provider.
	const [highlightsVisible, setHighlightsVisibleState] = useState(true)

	const setHighlightsVisible = useStableEvent((visible: boolean) => {
		setHighlightsVisibleState(visible)

		notifyHighlightsVisible(visible)
	})

	const [root, setRoot] = useState<HTMLElement | null>(null)
	const viewportRef = useRef<HTMLDivElement>(null)

	const activePage = total > 0 ? pages[safePage - 1] : undefined

	// The document's own identity, not the resolved `pages`: the cache republishes
	// that array once per rasterized page. A key on it reset the reader's rotations on
	// each page of a streaming load. Both reset hooks take this one key.
	const documentKey = useDocumentKey(pagesProp, src)

	const { rotation, transposed, rotate } = usePdfViewerPageRotation(safePage, documentKey)

	const { pageSize, onImageLoad } = usePdfViewerPageSize(activePage, safePage, documentKey)

	// `transposed` is the invalidation key; the viewport re-measures
	// synchronously on rotation flip, before paint.
	const viewportSize = usePdfViewerViewportSize(viewportRef, transposed)

	// Aspect ratio drives the viewport height. US Letter (8.5 × 11) is the
	// pre-load fallback. Unset when there is no content to display.
	const hasContent = !!src || total > 0

	// Primitive dependencies: the cache republishes the slot of a page as it renders, so the
	// slot identity changes while its points stay the same.
	const pointWidth = activePage?.pointWidth

	const pointHeight = activePage?.pointHeight

	const pointSize = useMemo(
		() => (pointWidth && pointHeight ? { width: pointWidth, height: pointHeight } : null),
		[pointWidth, pointHeight],
	)

	const scale = usePdfViewerPageScale({
		viewportSize,
		pageSize,
		pointSize,
		rotation,
		zoom: zoomValue,
		hasContent,
		fit,
	})

	// Before the document opens, `safePage` is 0, so the page that the viewer will show is the
	// one it asks for. The cache clamps it to the page count.
	const showThumbnails = usePdfViewerDocumentFocus(
		shouldLoadFromSrc ? src : undefined,
		safePage || (page ?? defaultPage),
		scale.imageWidth,
	)

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
			showThumbnails,
			filename: downloadName,
			loading,
			pending,
			error,
			railed,
			offcanvas,
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
			root,
			setRoot,
			viewportRef,
			// Withheld while the loupe is off, which disables every interaction hook inside
			// `usePdfViewerMagnifier` rather than merely hiding the lens: a switched-off loupe
			// must not track the pointer across the page and re-render on every move.
			magnifierSettings: magnifierOn && magnifierChoice ? resolveMagnifier(magnifierChoice) : null,
			magnifierOn,
			setMagnifierOn,
			magnifierMode: magnifierAsked ? (magnifierModeProp ?? 'simple') : null,
			magnifierChoice,
			setMagnifierChoice,
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
			showThumbnails,
			downloadName,
			loading,
			pending,
			error,
			railed,
			offcanvas,
			sidebarOpen,
			sidebarAnimates,
			thumbsOpen,
			setThumbsOpen,
			hasHighlights,
			highlightsVisible,
			setHighlightsVisible,
			setMagnifierOn,
			visible,
			onImageLoad,
			root,
			magnifierAsked,
			magnifierModeProp,
			magnifierOn,
			magnifierChoice,
			setMagnifierChoice,
		],
	)
}
