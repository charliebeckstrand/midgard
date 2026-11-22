import { describe, expect, it } from 'vitest'
import { makeInvoicePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { renderUI } from '../helpers'
import { pageImage, servePdfFor } from './helpers/pdf-viewer'

/**
 * The viewer renders a real PDF in a browser below the newest built-ins.
 *
 * The modern build of pdf.js 6 calls `Map.prototype.getOrInsertComputed`, `Promise.try`,
 * `Math.sumPrecise` and the `Uint8Array` base64 methods with no fallback. The viewer loads the
 * legacy build, which fills each one, and the page renders. This file fails on the modern build
 * only in a Chromium under 145. The pinned Chromium is above that, so this file does not prove
 * the floor. The case `loads only the legacy build` in `pdf-viewer-binary-data-boundary.test.ts`
 * holds the floor.
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
