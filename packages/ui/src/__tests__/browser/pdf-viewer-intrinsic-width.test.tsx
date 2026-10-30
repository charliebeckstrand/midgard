import { describe, expect, it } from 'vitest'
import { makeInvoicePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { getSlot, present, renderUI, waitFor } from '../helpers'
import { pageImage, servePdfFor } from './helpers/pdf-viewer'

/** US Letter, 8.5 in at 96 px per inch: the width of the fixture page at 100%. */
const LETTER_WIDTH = 816

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
	it('shows the page at its natural width in a box that sizes to its content', async () => {
		const src = servePdfFor(makeInvoicePdf(1))

		const { container } = renderUI(
			<div style={{ width: 1200 }}>
				<div className="w-max min-w-96">
					<PdfViewer src={src} fit="page" aria-label="Invoice" />
				</div>
			</div>,
		)

		const frame = present((await pageImage(container)).parentElement, 'the page frame')

		await waitFor(() => expect(frame.getBoundingClientRect().width).toBeCloseTo(LETTER_WIDTH, 0))

		expect(getSlot(container, 'pdf-viewer').getBoundingClientRect().width).toBeGreaterThan(
			LETTER_WIDTH,
		)
	})

	it.each([
		['wider', 1200],
		['narrower', 500],
	])('fills a box %s than the page', async (_, width) => {
		const src = servePdfFor(makeInvoicePdf(1))

		const { container } = renderUI(
			<div style={{ width }}>
				<PdfViewer src={src} fit="page" aria-label="Invoice" />
			</div>,
		)

		const frame = present((await pageImage(container)).parentElement, 'the page frame')

		expect(getSlot(container, 'pdf-viewer').getBoundingClientRect().width).toBe(width)

		await waitFor(() => expect(Math.abs(fitGap(container, frame))).toBeLessThan(1))
	})
})
