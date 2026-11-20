import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PdfViewerPage, PdfViewerTextItem } from '../../components/pdf-viewer/types'
import {
	indexText,
	matchText,
	type PdfViewerSearchInput,
	usePdfViewerSearch,
} from '../../components/pdf-viewer/use-pdf-viewer-search'
import { noop } from '../helpers'

// The hook takes the document as arguments, so a case needs no `<PdfViewer>`. The toolbar
// control and the layer that render from it are covered in `pdf-viewer-search.test.tsx`.

/** US Letter: 612 × 792 points, so 8.5 × 11 inches. */
const letter: PdfViewerPage = {
	id: 'a',
	src: 'page-1.png',
	width: 850,
	height: 1100,
	pointWidth: 612,
	pointHeight: 792,
}

const box = { x: 0.1, y: 0.1, width: 0.1, height: 0.02 }

/** Words in reading order, out of page order: the index sorts the pages. */
const data: PdfViewerTextItem[] = [
	{ page: 2, text: 'Total', rect: box },
	{ page: 2, text: 'due', rect: { ...box, x: 0.3 } },
	{ page: 1, text: 'Invoice', rect: box },
	{ page: 1, text: 'Total', rect: { ...box, y: 0.5 } },
	{ page: 3, text: 'Café', rect: box },
	{ page: 3, text: 'total', rect: { ...box, y: 0.7 } },
]

function search(query: string, items: readonly PdfViewerTextItem[] = data) {
	return matchText(indexText(items), query)
}

function renderSearch(props: Partial<PdfViewerSearchInput> = {}) {
	return renderHook((next: Partial<PdfViewerSearchInput>) =>
		usePdfViewerSearch({
			data,
			activePage: letter,
			safePage: 1,
			goToPage: noop,
			...props,
			...next,
		}),
	)
}

describe('matchText', () => {
	it('finds each match in page order, then in reading order', () => {
		expect(search('total')).toEqual([
			{ page: 1, items: [3] },
			{ page: 2, items: [0] },
			{ page: 3, items: [5] },
		])
	})

	it('folds case, diacritics, and white space in the data and in the query', () => {
		expect(search('  CAFE ')).toEqual([{ page: 3, items: [4] }])

		expect(search('total   due')).toEqual([{ page: 2, items: [0, 1] }])
	})

	it('marks each run that a match touches, and only those', () => {
		const lines: PdfViewerTextItem[] = [
			{ page: 1, text: 'Amount', rect: box },
			{ page: 1, text: 'total due now', rect: box },
			{ page: 1, text: 'paid', rect: box },
		]

		expect(search('due', lines)).toEqual([{ page: 1, items: [1] }])

		expect(search('amount total', lines)).toEqual([{ page: 1, items: [0, 1] }])

		expect(search('now paid', lines)).toEqual([{ page: 1, items: [1, 2] }])
	})

	it('does not join the runs of two pages', () => {
		expect(search('invoice total total')).toEqual([])
	})

	it('finds matches that do not overlap, as the find of a browser does', () => {
		const items: PdfViewerTextItem[] = [{ page: 1, text: 'aaaa', rect: box }]

		expect(search('aa', items)).toHaveLength(2)
	})

	it('matches nothing for an empty query, or a query of white space', () => {
		expect(search('')).toEqual([])

		expect(search('   ')).toEqual([])
	})
})

describe('usePdfViewerSearch', () => {
	it('is offered where data holds a run, and not where search is false', () => {
		expect(renderSearch().result.current.offered).toBe(true)

		expect(renderSearch({ search: true }).result.current.offered).toBe(true)

		expect(renderSearch({ search: {} }).result.current.offered).toBe(true)

		expect(renderSearch({ search: false }).result.current.offered).toBe(false)

		expect(renderSearch({ data: undefined }).result.current.offered).toBe(false)

		expect(renderSearch({ data: [] }).result.current.offered).toBe(false)
	})

	it('makes the first match on or after the page on screen current, and turns to its page', () => {
		const goToPage = vi.fn()

		const { result } = renderSearch({ safePage: 2, goToPage })

		act(() => result.current.setQuery('total'))

		// The matches are on pages 1, 2, and 3. The reader typed on page 2.
		expect(result.current.total).toBe(3)

		expect(result.current.current).toBe(1)

		// The current match is on the page on screen, so the viewer does not turn.
		expect(goToPage).not.toHaveBeenCalled()

		act(() => result.current.next())

		expect(result.current.current).toBe(2)

		expect(goToPage).toHaveBeenLastCalledWith(3)
	})

	it('wraps at each end of the document', () => {
		const { result } = renderSearch()

		act(() => result.current.setQuery('total'))

		expect(result.current.current).toBe(0)

		act(() => result.current.previous())

		expect(result.current.current).toBe(2)

		act(() => result.current.next())

		expect(result.current.current).toBe(0)
	})

	it('turns once for each match, and not again when the reader turns away', () => {
		const goToPage = vi.fn()

		const { result, rerender } = renderSearch({ goToPage })

		act(() => result.current.setQuery('due'))

		expect(goToPage).toHaveBeenCalledTimes(1)

		expect(goToPage).toHaveBeenLastCalledWith(2)

		// The reader turns back to page 1. The match stays current, and the page stays.
		rerender({ safePage: 1 })

		rerender({ safePage: 3 })

		expect(goToPage).toHaveBeenCalledTimes(1)
	})

	it('does not turn the page with navigate false', () => {
		const goToPage = vi.fn()

		const { result } = renderSearch({ goToPage, search: { navigate: false } })

		act(() => result.current.setQuery('due'))

		expect(result.current.total).toBe(1)

		act(() => result.current.next())

		expect(goToPage).not.toHaveBeenCalled()
	})

	it('waits for the pages of a cold document before it turns', () => {
		const goToPage = vi.fn()

		const { result, rerender } = renderSearch({ goToPage, activePage: undefined, safePage: 0 })

		act(() => result.current.setQuery('due'))

		expect(goToPage).not.toHaveBeenCalled()

		rerender({ activePage: letter, safePage: 1 })

		expect(goToPage).toHaveBeenCalledWith(2)
	})

	it('gives the boxes of the matches on the page on screen, and marks the current match', () => {
		const { result } = renderSearch({ safePage: 2 })

		act(() => result.current.setQuery('t'))

		// "Total" and "due" on page 2: "t" is in "Total" twice, and in "due" never.
		expect(result.current.hits).toEqual([
			{ key: expect.any(String), rect: box, current: true },
			{ key: expect.any(String), rect: box, current: false },
		])
	})

	it('converts an inch box against the page on screen', () => {
		const { result } = renderSearch({
			highlightUnit: 'inch',
			data: [{ page: 1, text: 'Total', rect: { x: 0.85, y: 1.1, width: 1.7, height: 0.11 } }],
		})

		act(() => result.current.setQuery('total'))

		const [hit] = result.current.hits

		expect(hit?.rect.x).toBeCloseTo(0.1)

		expect(hit?.rect.y).toBeCloseTo(0.1)

		expect(hit?.rect.width).toBeCloseTo(0.2)

		expect(hit?.rect.height).toBeCloseTo(0.01)
	})

	it('gives no boxes with highlight false, and keeps the count', () => {
		const { result } = renderSearch({ search: { highlight: false } })

		act(() => result.current.setQuery('total'))

		expect(result.current.total).toBe(3)

		expect(result.current.hits).toEqual([])
	})

	it('paints amber by default, and the color that highlight names', () => {
		expect(renderSearch().result.current.color).toBe('amber')

		expect(renderSearch({ search: { highlight: { color: 'blue' } } }).result.current.color).toBe(
			'blue',
		)
	})

	it('counts the matches of each page, and names the page of the current match', () => {
		const { result } = renderSearch({ safePage: 2 })

		act(() => result.current.setQuery('t'))

		expect(result.current.pageMatches).toEqual(
			new Map([
				[1, 2],
				[2, 2],
				[3, 2],
			]),
		)

		expect(result.current.currentPage).toBe(2)

		act(() => result.current.next())

		act(() => result.current.next())

		expect(result.current.currentPage).toBe(3)
	})

	it('clears the matches with the query', () => {
		const { result } = renderSearch()

		act(() => result.current.setQuery('total'))

		act(() => result.current.setQuery(''))

		expect(result.current.total).toBe(0)

		expect(result.current.current).toBeNull()

		expect(result.current.hits).toEqual([])

		expect(result.current.pageMatches.size).toBe(0)

		expect(result.current.currentPage).toBeUndefined()
	})
})
