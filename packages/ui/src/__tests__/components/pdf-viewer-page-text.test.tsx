import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer, type PdfViewerPage, type PdfViewerTextItem } from '../../components/pdf-viewer'
import {
	ensureDocumentLoad,
	type PdfLoadReport,
	readPageText,
	resetDocumentCache,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { pageText } from '../../components/pdf-viewer/use-pdf-viewer-document'
import { bySlot, deferred, renderUI, waitFor } from '../helpers'

/**
 * A page of the viewer is an image named "Page N". The text of the page that the viewer
 * shows follows the image, visually hidden, so a screen reader reads the content of the
 * page too (WCAG 1.1.1). The text comes from the OCR `data`, else from the text that pdf.js
 * reads off a `src` document.
 */

const pages: PdfViewerPage[] = [
	{ id: 'a', src: 'page-1.png' },
	{ id: 'b', src: 'page-2.png' },
	{ id: 'c', src: 'page-3.png' },
]

const rect = { x: 0, y: 0, width: 1, height: 1 }

const data: PdfViewerTextItem[] = [
	{ page: 1, text: 'Invoice 1042', rect },
	{ page: 1, text: ' Total due: $310 ', rect },
	{ page: 2, text: 'Terms and conditions', rect },
]

/** The visually hidden text of the page, or `null`. */
function shownText(container: HTMLElement) {
	return bySlot(container, 'pdf-viewer-page-text')?.textContent ?? null
}

describe('PdfViewer page text', () => {
	beforeEach(() => resetDocumentCache())

	afterEach(() => resetDocumentCache())

	it('gives the text of the shown page from the OCR data, and follows a page turn', () => {
		const { container, rerender } = renderUI(<PdfViewer pages={pages} data={data} page={1} />)

		expect(shownText(container)).toBe('Invoice 1042 Total due: $310')

		expect(bySlot(container, 'pdf-viewer-page-text')).toHaveClass('sr-only')

		rerender(<PdfViewer pages={pages} data={data} page={2} />)

		expect(shownText(container)).toBe('Terms and conditions')

		// No run is on the last page, so it has no text.
		rerender(<PdfViewer pages={pages} data={data} page={3} />)

		expect(shownText(container)).toBeNull()
	})

	it('gives no text without data on the pages path', () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		expect(shownText(container)).toBeNull()
	})

	it('gives the text that the document reads on the src path', async () => {
		const read = vi.fn(async (index: number) => (index === 0 ? 'Chapter one' : 'Chapter two'))

		ensureDocumentLoad('/book.pdf', async (report) => {
			report.open([1, 2].map((id) => ({ id, src: '', width: 918, height: 1188 })))

			report.read(read)
		})

		const { container, rerender } = renderUI(<PdfViewer src="/book.pdf" page={1} />)

		await waitFor(() => expect(shownText(container)).toBe('Chapter one'))

		rerender(<PdfViewer src="/book.pdf" page={2} />)

		await waitFor(() => expect(shownText(container)).toBe('Chapter two'))

		rerender(<PdfViewer src="/book.pdf" page={1} />)

		await waitFor(() => expect(shownText(container)).toBe('Chapter one'))

		// The entry keeps each read, so the page that comes back reads no text again.
		expect(read.mock.calls.map(([index]) => index)).toEqual([0, 1])
	})

	it('prefers the OCR data to the text of a src document', async () => {
		const read = vi.fn(async () => 'pdf.js text')

		ensureDocumentLoad('/scan.pdf', async (report) => {
			report.open([{ id: 1, src: '', width: 918, height: 1188 }])

			report.read(read)
		})

		const { container } = renderUI(<PdfViewer src="/scan.pdf" data={data} />)

		await waitFor(() => expect(shownText(container)).toBe('Invoice 1042 Total due: $310'))

		expect(read).not.toHaveBeenCalled()
	})
})

describe('readPageText', () => {
	beforeEach(() => resetDocumentCache())

	afterEach(() => resetDocumentCache())

	/** Opens `src` with a reader, and returns the reader. */
	async function open(src: string, reader: (index: number) => Promise<string>) {
		const settled = deferred()

		let report: PdfLoadReport | undefined

		ensureDocumentLoad(src, (next) => {
			report = next

			return settled.promise
		})

		report?.read(reader)

		settled.resolve()

		await settled.promise
	}

	it('gives null for a document that no reader can read', async () => {
		await expect(readPageText(undefined, 0)).resolves.toBeNull()

		await expect(readPageText('/missing.pdf', 0)).resolves.toBeNull()
	})

	it('reads a page once, and reads a failed page again', async () => {
		let fail = true

		const reader = vi.fn(async (index: number) => {
			if (fail) throw new Error('read failed')

			return `Page ${index + 1} text`
		})

		await open('/flaky.pdf', reader)

		await expect(readPageText('/flaky.pdf', 0)).resolves.toBeNull()

		fail = false

		await expect(readPageText('/flaky.pdf', 0)).resolves.toBe('Page 1 text')

		await expect(readPageText('/flaky.pdf', 0)).resolves.toBe('Page 1 text')

		expect(reader).toHaveBeenCalledTimes(2)
	})
})

describe('pageText', () => {
	it('joins the items of a page, with a space at each line end, and collapses whitespace', () => {
		expect(
			pageText([
				{ str: 'Dear', hasEOL: false },
				{ str: ' ', hasEOL: false },
				{ str: 'reader,', hasEOL: true },
				{ type: 'beginMarkedContent' },
				{ str: 'welcome  to', hasEOL: false },
				{ str: ' the book.', hasEOL: true },
			]),
		).toBe('Dear reader, welcome to the book.')
	})

	it('gives an empty string for a page with no text', () => {
		expect(pageText([])).toBe('')
	})
})
