'use client'

import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import type { Color } from '../../core/recipe'
import { useControllable, useScrollWithin } from '../../hooks'
import { usePdfViewerContext } from './context'
import { toFractionRect } from './pdf-viewer-highlight-geometry'
import type { PdfViewerHighlight, PdfViewerHighlightRect, PdfViewerHighlightUnit } from './types'

/** Data attribute carrying a region's id, so one delegated handler serves every region. @internal */
export const HIGHLIGHT_ID_ATTR = 'data-pdf-highlight-id'

/** Selector for the layer's regions — the roving item set and the delegated handler's target. @internal */
export const HIGHLIGHT_SELECTOR = `[${HIGHLIGHT_ID_ATTR}]`

/** Paint a region gets when it names no {@link PdfViewerHighlight.color}. @internal */
const DEFAULT_HIGHLIGHT_COLOR: Color = 'amber'

/** Inputs to {@link usePdfViewerHighlights}; the highlight half of {@link PdfViewerProps}. @internal */
export type PdfViewerHighlightsOptions = {
	highlights?: readonly PdfViewerHighlight[]
	highlightUnit?: PdfViewerHighlightUnit
	activeHighlightId?: string | null
	defaultActiveHighlightId?: string
	onActiveHighlightChange?: (id: string | null) => void
	onHighlightPress?: (id: string) => void
}

/** One region of the active page, converted and resolved for painting. @internal */
export type PdfViewerRegion = {
	id: string
	label: string
	color: Color
	/** Box in `[0, 1]` page fractions — whatever unit the caller supplied, normalized. */
	rect: PdfViewerHighlightRect
	active: boolean
}

/** The overlay's state, provided through {@link PdfViewerHighlightsContext}. @internal */
export type PdfViewerHighlightsResult = {
	/** Regions on the active page only, in the caller's order. */
	regions: PdfViewerRegion[]
	/** True when regions are controls: `onActiveHighlightChange` is set. */
	interactive: boolean
	/** Label of the active region, for the announcement; `null` when none is active. */
	activeLabel: string | null
	activate: (id: string) => void
	/** Reports a press on any region, the already-active one included. */
	press: (id: string) => void
	clear: () => void
	/**
	 * Callback ref for the active region. Fires on the becoming-active edge, after the
	 * region has mounted at its measured size, and brings it into view.
	 */
	revealRef: (node: HTMLElement | null) => void
}

/**
 * Resolves the highlight overlay's state: the active page's regions in page fractions, the
 * controllable active-region binding, and the reveal that follows it.
 *
 * @returns The {@link PdfViewerHighlightsResult} the layer renders from.
 * @remarks Filters and converts inline rather than memoizing a derived array. A consumer
 * builds `highlights` by mapping its own data, so the reference changes every render and a
 * memo keyed on it would never hit — while its output identity would then flow onward as
 * though it were stable.
 *
 * The pass is O(every highlight in the document), not O(on-screen regions): filtering by
 * page has to visit them all. Measured, that is ~7 µs at 420 highlights and ~125 µs at
 * 15,000 — well under a memo's own overhead for any realistic document, and past roughly
 * 5,000 it stops being free per frame under a continuous resize or zoom drag.
 * `'fraction'` (the default) is a pass-through.
 * @internal
 */
export function usePdfViewerHighlights({
	highlights,
	highlightUnit = 'fraction',
	activeHighlightId,
	defaultActiveHighlightId,
	onActiveHighlightChange,
	onHighlightPress,
}: PdfViewerHighlightsOptions): PdfViewerHighlightsResult {
	const { activePage, safePage, goToPage } = usePdfViewerContext()

	const [activeId, setActiveId] = useControllable<string>({
		value: activeHighlightId,
		defaultValue: defaultActiveHighlightId,
		onValueChange: onActiveHighlightChange,
	})

	const scrollWithin = useScrollWithin()

	const reduceMotion = useReducedMotion()

	const regions: PdfViewerRegion[] = []

	let missingExtent = false

	// Looks past the page filter below: the active region may sit on a page the viewer is
	// not showing, because the list beside the viewer selects by field, not by page. Read
	// before that filter, so the one pass serves both it and the regions.
	let activeHighlightPage: number | undefined

	for (const highlight of highlights ?? []) {
		if (activeId && activeHighlightPage === undefined && highlight.id === activeId) {
			activeHighlightPage = highlight.page
		}

		if (highlight.page !== safePage) continue

		const rect = toFractionRect(highlight.rect, highlightUnit, activePage)

		// A physical unit with no page extent to divide by: render nothing for this region
		// rather than guess a page size. Warned about once, below.
		if (!rect) {
			missingExtent = true

			continue
		}

		regions.push({
			id: highlight.id,
			label: highlight.label,
			color: highlight.color ?? DEFAULT_HIGHLIGHT_COLOR,
			rect,
			active: highlight.id === activeId,
		})
	}

	const activeLabel = regions.find((region) => region.active)?.label ?? null

	useMissingExtentWarning(missingExtent, highlightUnit)

	// The active region can live on a page the viewer is not showing — the field panel
	// beside the viewer selects by field, not by page — so navigate to it. Latched on the
	// id: goToPage fires the consumer's onPageChange even when the page is unchanged, so a
	// consumer re-passing activeHighlightId every render would spam it.
	const navigatedForRef = useRef<string | null>(null)

	useEffect(() => {
		if (!activeId) {
			navigatedForRef.current = null

			return
		}

		if (activeHighlightPage === undefined || navigatedForRef.current === activeId) return

		navigatedForRef.current = activeId

		goToPage(activeHighlightPage)
	}, [activeId, activeHighlightPage, goToPage])

	// Reveal-once latch, cleared in render on any change of the active id — including to
	// null, so re-selecting the same region reveals again — rather than in the ref's own
	// detach, which StrictMode's dev replay of a moved fiber would trip into scrolling twice.
	const revealedRef = useRef<string | null>(null)

	if (revealedRef.current !== activeId) revealedRef.current = null

	const revealRef = useCallback(
		(node: HTMLElement | null) => {
			if (!node) return

			const id = node.getAttribute(HIGHLIGHT_ID_ATTR)

			if (!id || revealedRef.current === id) return

			revealedRef.current = id

			// scrollWithin, not scrollIntoView: the viewer can sit inside a drawer, and
			// walking every ancestor scroller would yank the whole screen. Both axes,
			// because the viewport overflows both above fit.
			scrollWithin(node, {
				block: 'nearest',
				inline: 'nearest',
				behavior: reduceMotion ? 'auto' : 'smooth',
			})
		},
		[scrollWithin, reduceMotion],
	)

	const clear = useCallback(() => setActiveId(null), [setActiveId])

	// Read through a ref so a consumer that rebuilds the handler each render — the common case
	// for an inline arrow — does not change the layer's props and re-render every region.
	const onPressRef = useRef(onHighlightPress)

	onPressRef.current = onHighlightPress

	const press = useCallback((id: string) => onPressRef.current?.(id), [])

	return {
		regions,
		interactive: onActiveHighlightChange !== undefined,
		activeLabel,
		activate: setActiveId,
		press,
		clear,
		revealRef,
	}
}

/**
 * Warns once, in development, when a physical `highlightUnit` has no page extent to divide
 * by — the regions render nothing, and silence would read as "there were none".
 *
 * @remarks A private hook rather than an inline effect, matching the package's other two
 * dev-time warnings.
 * @internal
 */
function useMissingExtentWarning(missingExtent: boolean, highlightUnit: PdfViewerHighlightUnit) {
	const warned = useRef(false)

	useEffect(() => {
		if (process.env.NODE_ENV === 'production' || !missingExtent || warned.current) return

		warned.current = true

		console.warn(
			`PdfViewer: highlightUnit="${highlightUnit}" needs the page's own size, but the active page carries no pointWidth/pointHeight. Those regions are not rendered. Pages rasterized from \`src\` always carry it; supply it on caller-provided \`pages\`.`,
		)
	}, [missingExtent, highlightUnit])
}
