'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Color } from '../../core/recipe/colors'
import { useStableEvent } from '../../hooks/use-stable-event'
import { toFractionRect } from './pdf-viewer-highlight-geometry'
import type {
	PdfViewerHighlightRect,
	PdfViewerHighlightUnit,
	PdfViewerPage,
	PdfViewerSearchOptions,
	PdfViewerTextItem,
} from './types'

/** Paint a match gets when the search names no color. @internal */
const DEFAULT_SEARCH_COLOR: Color = 'amber'

/**
 * Folds a text for the comparison: no diacritics, lower case, and one space for each run of
 * white space.
 *
 * @remarks The fold applies to each run of the data and to the query, in the same way. A
 * match is therefore an offset into folded text, and a fold that changes the length of a run
 * changes nothing that the search reads.
 * @internal
 */
function fold(text: string) {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** The folded text of one page, and where each run of the data sits in it. @internal */
export type PdfViewerPageText = {
	page: number
	/** The folded runs of the page, joined with a space. */
	text: string
	/** The index in `data` of each run, in the order of {@link PdfViewerPageText.text}. */
	items: number[]
	/** The offset in {@link PdfViewerPageText.text} where each run starts. */
	starts: number[]
	/** The offset in {@link PdfViewerPageText.text} where each run ends. */
	ends: number[]
}

/** One match of a query: its page, and the index in `data` of each run that it touches. @internal */
export type PdfViewerTextMatch = { page: number; items: number[] }

/**
 * Builds the text of each page from the OCR data, in page order.
 *
 * @remarks The runs of a page keep the order of `data`, because that is the reading order
 * that the OCR engine gives. A run with no text after the fold takes no place.
 * @internal
 */
export function indexText(data: readonly PdfViewerTextItem[]): PdfViewerPageText[] {
	const pages = new Map<number, PdfViewerPageText>()

	data.forEach((item, index) => {
		const text = fold(item.text)

		if (!text) return

		let page = pages.get(item.page)

		if (!page) {
			page = { page: item.page, text: '', items: [], starts: [], ends: [] }

			pages.set(item.page, page)
		}

		if (page.text) page.text += ' '

		page.items.push(index)

		page.starts.push(page.text.length)

		page.text += text

		page.ends.push(page.text.length)
	})

	return [...pages.values()].sort((a, b) => a.page - b.page)
}

/**
 * Finds each match of `query` in the indexed text, in page order and then in reading order.
 *
 * @remarks The matches do not overlap: the next one starts after the end of the last one, as
 * the find of a browser does. An empty query matches nothing.
 * @internal
 */
export function matchText(pages: readonly PdfViewerPageText[], query: string) {
	const needle = fold(query)

	const matches: PdfViewerTextMatch[] = []

	if (!needle) return matches

	for (const { page, text, items, starts, ends } of pages) {
		// The runs are in offset order, and so are the matches, so one cursor serves the page.
		let run = 0

		let at = text.indexOf(needle)

		while (at !== -1) {
			const end = at + needle.length

			while ((ends[run] ?? Number.POSITIVE_INFINITY) <= at) run++

			const touched: number[] = []

			for (let next = run; next < items.length && (starts[next] ?? end) < end; next++) {
				touched.push(items[next] as number)
			}

			matches.push({ page, items: touched })

			at = text.indexOf(needle, end)
		}
	}

	return matches
}

/**
 * Whether the viewer offers the search: there is `data` with a run, and `search` is not `false`.
 *
 * @remarks One rule for the two places that ask: the search, and the thumbnail rail, which
 * reads no search state.
 * @internal
 */
export function isSearchOffered(
	data: readonly PdfViewerTextItem[] | undefined,
	search: boolean | PdfViewerSearchOptions | undefined,
) {
	return search !== false && !!data?.length
}

/** The match where a new query starts: the first on or after `page`, else the first. @internal */
function firstFrom(matches: readonly PdfViewerTextMatch[], page: number) {
	const index = matches.findIndex((match) => match.page >= page)

	return index === -1 ? 0 : index
}

/**
 * Inputs to {@link usePdfViewerSearch}: the search half of {@link PdfViewerProps}, plus the
 * three things the search needs from the document under it.
 *
 * @remarks The document half arrives as arguments, for the reason that
 * {@link PdfViewerHighlightsOptions} gives: a proof of the search then needs no mounted
 * viewer.
 * @internal
 */
export type PdfViewerSearchInput = {
	data?: readonly PdfViewerTextItem[]
	search?: boolean | PdfViewerSearchOptions
	highlightUnit?: PdfViewerHighlightUnit
	/** The page on screen; supplies the extent that a physical unit divides by. */
	activePage: PdfViewerPage | undefined
	/** Which page is on screen, 1-based. Only its matches are drawn. */
	safePage: number
	/** Turns to the page of the current match. */
	goToPage: (page: number) => void
}

/** One box of a run that a match touches on the page on screen, in page fractions. @internal */
type PdfViewerSearchHit = {
	key: string
	rect: PdfViewerHighlightRect
	/** True when the current match touches the run. */
	current: boolean
}

/** The state of the search, provided through {@link PdfViewerSearchContext}. @internal */
export type PdfViewerSearchResult = {
	/** True when the toolbar offers the search: there is `data`, and `search` is not `false`. */
	offered: boolean
	query: string
	setQuery: (query: string) => void
	/** The number of matches in the whole document. */
	total: number
	/** The 0-based index of the current match, or `null` when there is no match. */
	current: number | null
	/** Identifies the current match across renders, for the reveal; `null` with no match. */
	currentKey: string | null
	next: () => void
	previous: () => void
	/**
	 * The boxes of the runs that the matches touch on the page on screen, one for each run.
	 * Empty when `highlight` is `false`.
	 */
	hits: PdfViewerSearchHit[]
	/** The number of matches on each page that has one, for the marks of the thumbnail rail. */
	pageMatches: ReadonlyMap<number, number>
	color: Color
}

/** The query of the reader, the page where they typed it, and the match they stepped to. @internal */
type SearchState = {
	query: string
	/**
	 * Counts the changes of the query and the steps. Each one is a new request of the reader to
	 * see the current match, also when the current match is the same match again.
	 */
	seq: number
	/** The page on screen when the query changed. The first match on or after it is current. */
	anchor: number
	/** The match that a step chose, or `null` until a step. */
	index: number | null
}

const IDLE: SearchState = { query: '', seq: 0, anchor: 1, index: null }

/**
 * Resolves the search of the viewer: the matches of the query in the OCR data, the current
 * match, the page turn that follows it, and the boxes of the page on screen.
 *
 * @returns The {@link PdfViewerSearchResult} that the toolbar control and the layer render from.
 * @remarks The index of the text is built only while a query is there, and again only when
 * `data` changes identity. A consumer that loads its OCR data once therefore folds it once for
 * each query that the reader starts.
 *
 * A new query makes the first match on or after the page on screen current, as the find of a
 * browser does. A step then moves through the matches of the whole document, and wraps at
 * each end.
 * @internal
 */
export function usePdfViewerSearch({
	data,
	search,
	highlightUnit = 'fraction',
	activePage,
	safePage,
	goToPage,
}: PdfViewerSearchInput): PdfViewerSearchResult {
	const options: PdfViewerSearchOptions = typeof search === 'object' ? search : {}

	const { highlight = true, navigate = true } = options

	const color =
		(typeof highlight === 'object' ? highlight.color : undefined) ?? DEFAULT_SEARCH_COLOR

	const offered = isSearchOffered(data, search)

	const [state, setState] = useState<SearchState>(IDLE)

	const query = offered ? state.query : ''

	const searching = query !== ''

	const pages = useMemo(() => (searching && data ? indexText(data) : []), [searching, data])

	const matches = useMemo(() => matchText(pages, query), [pages, query])

	const total = matches.length

	// One map for each query, not one scan for each tile: the rail has a tile for each page.
	const pageMatches = useMemo(() => {
		const counts = new Map<number, number>()

		for (const match of matches) counts.set(match.page, (counts.get(match.page) ?? 0) + 1)

		return counts
	}, [matches])

	const current =
		total === 0
			? null
			: state.index === null
				? firstFrom(matches, state.anchor)
				: state.index % total

	const target = current === null ? undefined : matches[current]

	const targetPage = target?.page

	/*
	 * The request of the reader and the place of the current match. A step or a query is a new
	 * request, so a step to the only match turns to it again. A change of `data` that moves the
	 * current match is a new place, so the viewer follows it. A new `data` array with the same
	 * text is neither, and does nothing.
	 */
	const currentKey =
		target === undefined ? null : `${state.seq}:${target.page}:${target.items.join(',')}`

	// A stable event, so the field reads the page of the newest render and keeps one handler.
	const setQuery = useStableEvent((next: string) => {
		setState((prev) => ({ query: next, seq: prev.seq + 1, anchor: safePage, index: null }))
	})

	const step = useStableEvent((by: number) => {
		if (current === null) return

		setState((prev) => ({ ...prev, seq: prev.seq + 1, index: (current + by + total) % total }))
	})

	const next = useStableEvent(() => step(1))

	const previous = useStableEvent(() => step(-1))

	/*
	 * Turns to the page of the current match, once for each match.
	 *
	 * Latched on the key of the current match, for the reason that the highlight overlay latches
	 * on its id: the reader can turn away from the page of a match, and a render must not turn
	 * them back. A step or a new query changes the key, so it turns again. A document with no
	 * pages yet shows no page, so the latch waits for the pages.
	 */
	const navigatedRef = useRef<string | null>(null)

	const loaded = activePage !== undefined

	useEffect(() => {
		if (!navigate || !loaded || currentKey === null || targetPage === undefined) return

		if (navigatedRef.current === currentKey) return

		navigatedRef.current = currentKey

		if (targetPage !== safePage) goToPage(targetPage)
	}, [navigate, loaded, currentKey, targetPage, safePage, goToPage])

	/*
	 * One box for each run on the page, not one for each match. A run can hold several matches,
	 * such as "t" in "Total", and a wash for each would stack, so the density of the matches
	 * would set how dark a run is. A run is current when a match of the current match touches it.
	 */
	const runs = new Map<number, boolean>()

	if (highlight !== false) {
		matches.forEach((match, index) => {
			if (match.page !== safePage) return

			for (const item of match.items) runs.set(item, runs.get(item) === true || index === current)
		})
	}

	const hits: PdfViewerSearchHit[] = []

	for (const [item, isCurrent] of runs) {
		const run = data?.[item]

		const rect = run && toFractionRect(run.rect, highlightUnit, activePage)

		// A physical unit with no page extent to divide by draws nothing, as a highlight does.
		if (rect) hits.push({ key: String(item), rect, current: isCurrent })
	}

	return {
		offered,
		query,
		setQuery,
		total,
		current,
		currentKey,
		next,
		previous,
		hits,
		pageMatches,
		color,
	}
}
