'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useMediaQuery, useMinBreakpoint } from '../../hooks'
import type {
	PdfViewerFit,
	PdfViewerMagnifierMode,
	PdfViewerMagnifierOptions,
	PdfViewerMagnifierState,
	PdfViewerPage,
	PdfViewerZoom,
} from './types'
import { usePdfViewerDocument, usePdfViewerDocumentFocus } from './use-pdf-viewer-document'
import {
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
 * @internal
 */
function documentSettle(
	error: Error | null,
	pageCount: number,
	started: boolean,
): Error | null | 'pending' {
	if (error) return error

	if (pageCount > 0) return null

	return started ? EMPTY_DOCUMENT : 'pending'
}

/**
 * The report that a settle owes, or `undefined` when `previous` already made it.
 *
 * @remarks A load that the viewer already reported keeps its report. A failure after the open
 * does not also call `onError`.
 * @internal
 */
function nextReport(
	settled: Error | null,
	src: string | undefined,
	previous: string | undefined,
): string | undefined {
	if (settled && previous === `load:${src}`) return undefined

	const reported = `${settled === null ? 'load' : 'error'}:${src}`

	return reported === previous ? undefined : reported
}

/**
 * Whether two page sets show the same document: the same length, and the same `id` and
 * `src` at each index.
 *
 * @internal
 */
function samePages(previous: PdfViewerPage[] | undefined, next: PdfViewerPage[] | undefined) {
	if (previous === next) return true

	if (!previous || !next || previous.length !== next.length) return false

	return previous.every((entry, index) => {
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
	const heldRef = useRef(pagesProp)

	const held = samePages(heldRef.current, pagesProp) ? heldRef.current : pagesProp

	heldRef.current = held

	return held ?? src
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
	/**
	 * True while a `src` load has not started yet. The viewport paints its loading placeholder
	 * for it, so a cold `src` never shows the empty state first.
	 */
	pending: boolean
	error: Error | null
	/** True at the desktop breakpoint (≥ 1024px): pins the thumbnail sidebar instead of the Sheet. */
	isDesktop: boolean
	/**
	 * Desktop thumbnail sidebar open state; toggled from the toolbar.
	 *
	 * Mounts closed and opens once the document turns out to carry more than one page. A
	 * single page has nothing to navigate to. It would spend the rail's width on a tile of
	 * the page already on screen. The reader's own toggle overrides that from the first press.
	 */
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	/**
	 * Whether the rail slides between open and closed.
	 *
	 * False until the reader presses the toggle. Where the rail starts is derived from the page
	 * count, and that count arrives with the document. A rail that traveled on that change
	 * would announce the parse rather than the pages. The reader's press is a change they made,
	 * and it travels.
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
	rootRef: RefObject<HTMLElement | null>
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

/**
 * Composes the PDF viewer's state — document loading, pagination, per-page
 * rotation, zoom, and the measured viewport/page scale — into one memoized
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
	hasHighlights = false,
	magnifier: magnifierProp,
	onHighlightsVisibleChange,
	onMagnifierChange,
}: PdfViewerOptions): PdfViewerResult {
	/*
	 * The chrome the reader owns reports itself — the highlight overlay here, the loupe below.
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

	// Chrome, like the sidebar and the highlight toggle: nothing outside drives it, so it is
	// state rather than a prop. On by default — a consumer that passed the prop wants the loupe.
	const [magnifierOn, setMagnifierOnState] = useState(true)

	/*
	 * The reader's own settings, and `null` until they have one.
	 *
	 * The same nullable shape as `sidebarChoice` below, for the same reason. Until the reader
	 * opens the dialog and picks something, the consumer's prop is the answer. A consumer that
	 * changes it keeps driving the loupe. From the first press in the dialog the reader's
	 * choice holds, and no re-render can take it back from them.
	 */
	const [magnifierChoiceState, setMagnifierChoiceState] = useState<MagnifierChoice | null>(null)

	const magnifierChoice = magnifierChoiceState ?? magnifierOffered

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

	const setMagnifierOn = useCallback((on: boolean) => {
		setMagnifierOnState(on)

		notifyMagnifier({ enabled: on })
	}, [])

	const setMagnifierChoice = useCallback((choice: MagnifierChoice) => {
		setMagnifierChoiceState(choice)

		notifyMagnifier(choice)
	}, [])

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

	const total = pages.length

	const isDesktop = useMinBreakpoint('lg')

	const { safePage, goToPage } = usePdfViewerPagination({
		total,
		page,
		defaultPage,
		onPageChange,
	})

	// Before the document opens, `safePage` is 0, so the page that the viewer will show is the
	// one it asks for. The cache clamps it to the page count.
	usePdfViewerDocumentFocus(shouldLoadFromSrc ? src : undefined, safePage || (page ?? defaultPage))

	const [zoomValue, setZoomValue] = useState(defaultZoom)

	/*
	 * The thumbnail rail's own state, and `null` until the reader has an opinion.
	 *
	 * Nullable rather than a seeded boolean, because the answer depends on something no
	 * initializer can see. A one-page document has no navigation to offer. Pinning a rail
	 * beside it spends 224px of a panel that is often the narrower half of a split. That width
	 * goes on a tile of the page already on screen. The page count arrives with the document,
	 * since pdf.js has to parse the file first.
	 *
	 * **`> 1`, so it mounts closed.** The obvious reading of the rule is open unless the count
	 * is exactly one. That is true while the count is still 0, which is every frame before the
	 * document resolves. So a one-page PDF opened the rail and then visibly shut it, which is
	 * the flicker this exists to avoid. Closed until something is known to be worth navigating
	 * costs a multi-page document a slide open instead. That is the better of the two. It
	 * arrives with the pages it is for, rather than being taken away from a reader who was
	 * already looking at it.
	 *
	 * Derived rather than corrected by an effect, which would paint the wrong frame first
	 * whichever way the rule ran.
	 *
	 * The override is what makes deriving it safe. The moment the reader touches the toolbar's
	 * toggle, their choice wins for good. A rail they opened on a one-page document cannot be
	 * closed under them by a re-render. A document swap cannot reopen one they shut.
	 */
	const [sidebarChoice, setSidebarOpen] = useState<boolean | null>(null)

	const sidebarOpen = sidebarChoice ?? total > 1

	/*
	 * Only a reader's press moves the rail, and only where movement is wanted at all.
	 *
	 * It is read live through the media query, rather than through motion's
	 * `useReducedMotion`, which samples once at mount. A reader who turns reduced motion on
	 * mid-session would otherwise leave the rail carrying a transition whose `transitionend`
	 * the CSS had stopped sending. The rail's mount hold would then wait for it forever.
	 * `use-grid-reveal-hold.ts` documents the same trap.
	 */
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const sidebarAnimates = sidebarChoice !== null && !reducedMotion

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
	// that array once per rasterized page. A key on it reset the reader's rotations on
	// each page of a streaming load. Both reset hooks take this one key.
	const documentKey = useDocumentKey(pagesProp, src)

	const { rotation, isTransposed, rotate } = usePdfViewerPageRotation(safePage, documentKey)

	const { pageSize, onImageLoad } = usePdfViewerPageSize(activePage, safePage, documentKey)

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
			pending,
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
			filename,
			loading,
			pending,
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
			magnifierAsked,
			magnifierModeProp,
			magnifierOn,
			magnifierChoice,
			setMagnifierChoice,
		],
	)
}
