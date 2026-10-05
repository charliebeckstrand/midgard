import { afterEach, describe, expect, it } from 'vitest'
import { makeInvoicePdf, servePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { resetDocumentCache } from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { bySlot, getSlot, renderUI, waitFor } from '../helpers'

/** US Letter, 8.5 in at 96 px per inch: the width of the fixture page at 100%. */
const LETTER_WIDTH = 816

/** Waits for the page raster, and returns the frame that holds it. */
async function pageFrame(container: HTMLElement) {
	return waitFor(
		() => {
			const image = bySlot(container, 'pdf-viewer-viewport')?.querySelector(
				'[data-slot="pdf-viewer-page-image"]',
			)

			expect(image).not.toBeNull()

			return image?.parentElement as HTMLElement
		},
		{ timeout: 10_000 },
	)
}

/**
 * How far the fitted page is short of the viewport content box, on the axis that bounds it.
 * Zero when the page fills the box on one axis.
 */
function fitGap(container: HTMLElement, frame: HTMLElement) {
	const viewport = getSlot(container, 'pdf-viewer-viewport')

	const style = getComputedStyle(viewport)

	const width =
		viewport.clientWidth -
		Number.parseFloat(style.paddingLeft) -
		Number.parseFloat(style.paddingRight)

	const height =
		viewport.clientHeight -
		Number.parseFloat(style.paddingTop) -
		Number.parseFloat(style.paddingBottom)

	const page = frame.getBoundingClientRect()

	return Math.min(width - page.width, height - page.height)
}

/**
 * The fitted page takes its width from the measured viewport. In a box that sizes to its
 * content, the page thus cannot give the viewport a width. Before the fix, the viewer kept the
 * width of its toolbar from before the load, and the page showed small. The viewport now takes
 * the width of the page at 100%, and a box with a width of its own still sets the width.
 */
describe('pdf viewer intrinsic width (real browser)', () => {
	afterEach(() => resetDocumentCache())

	it('shows the page at its natural width in a box that sizes to its content', async () => {
		const src = servePdf(makeInvoicePdf(1))

		const { container } = renderUI(
			<div style={{ width: 1200 }}>
				<div className="w-max min-w-96">
					<PdfViewer src={src} fit="page" aria-label="Invoice" />
				</div>
			</div>,
		)

		const frame = await pageFrame(container)

		await waitFor(() => expect(frame.getBoundingClientRect().width).toBeCloseTo(LETTER_WIDTH, 0))

		expect(getSlot(container, 'pdf-viewer').getBoundingClientRect().width).toBeGreaterThan(
			LETTER_WIDTH,
		)

		URL.revokeObjectURL(src)
	})

	it.each([
		['wider', 1200],
		['narrower', 500],
	])('fills a box %s than the page', async (_, width) => {
		const src = servePdf(makeInvoicePdf(1))

		const { container } = renderUI(
			<div style={{ width }}>
				<PdfViewer src={src} fit="page" aria-label="Invoice" />
			</div>,
		)

		const frame = await pageFrame(container)

		expect(getSlot(container, 'pdf-viewer').getBoundingClientRect().width).toBe(width)

		await waitFor(() => expect(Math.abs(fitGap(container, frame))).toBeLessThan(1))

		URL.revokeObjectURL(src)
	})
})
