import { afterEach, describe, expect, it } from 'vitest'
import { makeInvoicePdf, servePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { resetDocumentCache } from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * The viewer renders a real PDF in a browser below the newest built-ins.
 *
 * The modern build of pdf.js 6 calls `Map.prototype.getOrInsertComputed`, `Promise.try`,
 * `Math.sumPrecise` and the `Uint8Array` base64 methods with no fallback. The pinned Chromium
 * (141) lacks `getOrInsertComputed`, so on the modern build the render throws and the viewport
 * shows the error. The viewer loads the legacy build, which fills each one, and the page renders.
 * This file needs a Chromium under 145 to fail without the fix. When the pinned Chromium moves
 * past that, the test still passes, and it no longer proves the floor.
 */
describe('pdf viewer below the newest browsers (real browser)', () => {
	afterEach(() => resetDocumentCache())

	it('renders the first page of a real document', async () => {
		const src = servePdf(makeInvoicePdf(2))

		const { container } = renderUI(
			<div style={{ width: 600, height: 800 }}>
				<PdfViewer src={src} fit="page" aria-label="Invoice" />
			</div>,
		)

		const image = await waitFor(
			() => {
				const viewport = bySlot(container, 'pdf-viewer-viewport')

				expect(viewport?.querySelector('[role="alert"]')).toBeNull()

				const found = viewport?.querySelector('[data-slot="pdf-viewer-page-image"]')

				expect(found).not.toBeNull()

				return found
			},
			{ timeout: 10_000 },
		)

		expect(image).toHaveAttribute('aria-label', 'Page 1')

		URL.revokeObjectURL(src)
	})
})
