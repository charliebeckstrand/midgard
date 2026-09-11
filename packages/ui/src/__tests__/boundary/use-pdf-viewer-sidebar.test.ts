import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PdfViewerPage } from '../../components/pdf-viewer'
import { usePdfViewer } from '../../components/pdf-viewer/use-pdf-viewer'

/**
 * When the thumbnail rail is open, which is decided from the page count rather than seeded.
 *
 * Tested on the hook rather than through the viewer, because the case that matters is the one
 * with no pages *yet* — a document still being parsed — and a mounted viewer given no pages at
 * all renders no rail and no toggle to read the state off.
 */

const page = (id: string): PdfViewerPage => ({ id, src: `${id}.png` })

function sidebar(pages: PdfViewerPage[]) {
	return renderHook(() => usePdfViewer({ pages }))
}

describe('the thumbnail rail mounts closed', () => {
	/*
	 * The bug this rule was written wrong for once: a viewer loading from `src` has no pages
	 * for as long as pdf.js takes to parse the file, so "open unless the count is exactly one"
	 * was true through that whole window — and a one-page invoice opened the rail and then
	 * visibly shut it.
	 */
	it('while the document is still being read', () => {
		expect(sidebar([]).result.current.sidebarOpen).toBe(false)
	})

	/** A single page has nothing to navigate to; the rail would be a tile of what is on screen. */
	it('and stays closed on a one-page document', () => {
		expect(sidebar([page('a')]).result.current.sidebarOpen).toBe(false)
	})
})

describe('it opens for a document worth navigating', () => {
	it('once more than one page has landed', () => {
		expect(sidebar([page('a'), page('b')]).result.current.sidebarOpen).toBe(true)
	})
})

describe("the reader's own press outranks the count", () => {
	/** Nothing may re-derive the rail out from under someone who opened it. */
	it('keeps a rail opened on a one-page document', () => {
		const { result } = sidebar([page('a')])

		act(() => result.current.setSidebarOpen(true))

		expect(result.current.sidebarOpen).toBe(true)
	})

	it('keeps a rail closed on a long one', () => {
		const { result } = sidebar([page('a'), page('b'), page('c')])

		act(() => result.current.setSidebarOpen(false))

		expect(result.current.sidebarOpen).toBe(false)
	})
})
