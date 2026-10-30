import { describe, expect, it } from 'vitest'
import { makeInvoicePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { renderUI } from '../helpers'
import { pageImage, servePdfFor } from './helpers/pdf-viewer'

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
	it('renders the first page of a real document', async () => {
		const src = servePdfFor(makeInvoicePdf(2))

		const { container } = renderUI(
			<div style={{ width: 600, height: 800 }}>
				<PdfViewer src={src} fit="page" aria-label="Invoice" />
			</div>,
		)

		// The wait fails at once when the viewport shows the error.
		const image = await pageImage(container)

		expect(image).toHaveAttribute('aria-label', 'Page 1')
	})
})
