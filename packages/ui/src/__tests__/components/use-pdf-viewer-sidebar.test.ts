import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PdfViewerPage } from '../../components/pdf-viewer'
import { usePdfViewer } from '../../components/pdf-viewer/use-pdf-viewer'

/**
 * When the thumbnail rail is open. It starts open for each document, and the page count has no
 * part in it.
 *
 * Tested on the hook rather than through the viewer, because the case that matters is the one
 * with no pages *yet* (a document still being parsed) and a mounted viewer given no pages at
 * all renders no rail and no toggle to read the state off.
 */

const page = (id: string): PdfViewerPage => ({ id, src: `${id}.png` })

function sidebar(pages: PdfViewerPage[]) {
	return renderHook(() => usePdfViewer({ pages }))
}

describe('the thumbnail rail starts open', () => {
	/*
	 * A viewer loading from `src` has no pages for as long as pdf.js takes to parse the file.
	 * A rail that waited for the count opened after the first paint, and the narrower page made
	 * the whole viewer shorter.
	 */
	it('while the document is still being read', () => {
		expect(sidebar([]).result.current.sidebarOpen).toBe(true)
	})

	/** A rail that closed for one page changed the layout the other way when the count landed. */
	it('on a one-page document', () => {
		expect(sidebar([page('a')]).result.current.sidebarOpen).toBe(true)
	})

	it('on a longer document', () => {
		expect(sidebar([page('a'), page('b')]).result.current.sidebarOpen).toBe(true)
	})
})

describe('the rail travels only for a press', () => {
	/* The rail is the viewer's own furniture, so it is simply there. */
	it('stands still before the reader presses the toggle', () => {
		expect(sidebar([]).result.current.sidebarAnimates).toBe(false)

		expect(sidebar([page('a'), page('b')]).result.current.sidebarAnimates).toBe(false)
	})

	/** A press is a change the reader made, and a change they made is worth watching. */
	it('travels once the reader has pressed the toggle', () => {
		const { result } = sidebar([page('a'), page('b')])

		act(() => result.current.setSidebarOpen(false))

		expect(result.current.sidebarAnimates).toBe(true)
	})
})

describe("the reader's own press holds", () => {
	it('keeps a rail closed on a one-page document', () => {
		const { result } = sidebar([page('a')])

		act(() => result.current.setSidebarOpen(false))

		expect(result.current.sidebarOpen).toBe(false)
	})

	it('keeps a rail closed on a long one', () => {
		const { result } = sidebar([page('a'), page('b'), page('c')])

		act(() => result.current.setSidebarOpen(false))

		expect(result.current.sidebarOpen).toBe(false)
	})
})
