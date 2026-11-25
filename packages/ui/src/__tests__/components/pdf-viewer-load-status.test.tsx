import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import {
	ensureDocumentLoad,
	type PdfLoadReport,
	resetDocumentCache,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { act, bySlot, deferred, renderUI } from '../helpers'

/** The status live region of the viewer. */
function status(container: HTMLElement) {
	return bySlot(container, 'pdf-viewer-page-status')
}

/**
 * The status live region says that a document loads, and then that it is
 * ready, with the page count (WCAG 4.1.3). It stays mounted through the load,
 * so a screen reader speaks the change.
 */
describe('PdfViewer load status', () => {
	beforeEach(() => resetDocumentCache())

	afterEach(() => resetDocumentCache())

	it('says "Loading PDF" while the document loads, and then the page count', async () => {
		const settled = deferred()

		let report: PdfLoadReport | undefined

		ensureDocumentLoad('/book.pdf', (next) => {
			report = next

			return settled.promise
		})

		const { container } = renderUI(<PdfViewer src="/book.pdf" />)

		const region = status(container)

		expect(region).toHaveAttribute('role', 'status')

		expect(region).toHaveTextContent('Loading PDF')

		await act(async () => {
			report?.open([1, 2].map((id) => ({ id, src: '', width: 918, height: 1188 })))

			settled.resolve()

			await settled.promise
		})

		// The same node, so the change is spoken and not a new region.
		expect(status(container)).toBe(region)

		expect(region).toHaveTextContent('Page 1 of 2')
	})

	it('says nothing when the load fails, which its alert speaks', async () => {
		ensureDocumentLoad('/broken.pdf', () => Promise.reject(new Error('network down')))

		const { container } = renderUI(<PdfViewer src="/broken.pdf" />)

		await act(async () => {})

		expect(status(container)).toBeEmptyDOMElement()
	})
})
