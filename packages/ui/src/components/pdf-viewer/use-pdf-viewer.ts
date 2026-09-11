'use client'

import type { RefObject, SyntheticEvent } from 'react'
import { useCallback, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useMediaQuery, useMinBreakpoint } from '../../hooks'
import type {
	PdfViewerFit,
	PdfViewerMagnifierMode,
	PdfViewerMagnifierOptions,
	PdfViewerMagnifierState,
	PdfViewerPage,
	PdfViewerZoom,
} from './types'
import { usePdfViewerDocument } from './use-pdf-viewer-document'
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
	onMagnifierChange?: (state: PdfViewerMagnifierState) => void
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
	 *
	 * False under `prefers-reduced-motion` too, which is what makes this one fact rather than
	 * two: the rail carries the transition only while this is true, so it is also the answer to
	 * "will a `transitionend` arrive" — the question the thumbnail rail's mount hold asks.
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
	/** Whether the loupe is switched on. Defaults to on. */
	magnifierOn: boolean
	setMagnifierOn: (on: boolean) => void
	/**
	 * How the toolbar's magnifier control behaves: a switch, or the control that opens
	 * {@link PdfViewerMagnifierSettings} — and `null` where the consumer asked for no loupe,
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
	onMagnifierChange,
}: PdfViewerOptions): PdfViewerResult {
	/*
	 * The chrome the reader owns reports itself — the highlight overlay here, the loupe below.
	 *
	 * Through `useEffectEvent`, which is how this package raises an optional consumer callback
	 * out of a state change (`use-copy-button-state.ts` does the same for `onCopiedChange`):
	 * it always sees the latest render's props and its own identity never changes, so a
	 * consumer passing an inline arrow cannot destabilize the setters below — and through them
	 * the context value every region on the page reads.
	 *
	 * They are events rather than a controlled binding on purpose: the reader owns these
	 * switches — nothing outside the viewer should be able to turn the highlights back on
	 * under them — while a consumer still needs to hear about it, because what it draws
	 * *beside* the viewer can be claiming a region is there to point at.
	 */
	const notifyHighlightsVisible = useEffectEvent((visible: boolean) => {
		onHighlightsVisibleChange?.(visible)
	})

	/*
	 * What the consumer asked for, independent of what the reader wants right now.
	 *
	 * Keyed on the settings rather than on the object that carries them. `magnifier={{ mode:
	 * 'config' }}` written inline is a new object on every render of the consumer, and config
	 * mode makes an object the common shape rather than the exception a different power used
	 * to be. Keyed on identity, that rebuilt the resolved settings every render — and through
	 * them the memoized context value the toolbar, the thumbnail rail and every region on the
	 * page read, which is the one guarantee this hook's final memo exists to make.
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
	 * The same nullable shape as `sidebarChoice` below, for the same reason: until the reader
	 * opens the dialog and picks something, the consumer's prop is the answer, and a consumer
	 * that changes it keeps driving the loupe. From the first press in the dialog the reader's
	 * choice holds, and no re-render can take it back from them.
	 */
	const [magnifierChoiceState, setMagnifierChoiceState] = useState<MagnifierChoice | null>(null)

	const magnifierChoice = magnifierChoiceState ?? magnifierOffered

	/*
	 * One report for the whole of what the reader owns, rather than one per switch.
	 *
	 * Through `useEffectEvent` for the reason the highlight notifier above uses it, and for a
	 * second one: it reads `magnifierOn` and `magnifierChoice` off the latest render, so the
	 * two setters below can close over neither and keep the stable identities the context memo
	 * needs. `next` is spread last, because the setter that raises this knows its own new value
	 * while the render this reads from still holds the old one.
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

	/*
	 * Only a reader's press moves the rail, and only where movement is wanted at all.
	 *
	 * Read live through the media query rather than through motion's `useReducedMotion`, which
	 * samples once at mount: a reader who turns reduced motion on mid-session would otherwise
	 * leave the rail carrying a transition whose `transitionend` the CSS had stopped sending,
	 * and the rail's mount hold would wait for it forever. `use-grid-reveal-hold.ts` documents
	 * the same trap.
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
	// that array once per rasterized page, so keying on it reset the reader's
	// rotations — and re-ran every hook below — on each page of a streaming load.
	// Consumer-supplied pages carry no stable identity either: `pages` is a prop a
	// parent rebuilds on any render, and a fresh array reads as a document swap, so
	// an unrelated re-render discarded every rotation the reader applied. Key on the
	// page sources instead, which are required and change only with the document.
	// `src` alone cannot serve, because a consumer that passes `pages` may pass none.
	const documentKey = useMemo(
		() => (pagesProp ? pagesProp.map((page) => page.src).join('\n') : src),
		[pagesProp, src],
	)

	const { rotation, isTransposed, rotate } = usePdfViewerPageRotation(safePage, documentKey)

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
			// Withheld while the loupe is off, which disables every interaction hook inside
			// `usePdfViewerMagnifier` rather than merely hiding the lens: a switched-off loupe
			// should not be tracking the pointer across the page and re-rendering on every move.
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
