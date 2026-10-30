import { describe, expect, it, onTestFinished } from 'vitest'
import { makeInvoicePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { frames, getSlot, present, renderUI, waitFor } from '../helpers'
import { pageImage, servePdfFor } from './helpers/pdf-viewer'

/** The width of the viewport content box. */
function contentWidth(viewport: HTMLElement) {
	const style = getComputedStyle(viewport)

	return (
		viewport.clientWidth -
		Number.parseFloat(style.paddingLeft) -
		Number.parseFloat(style.paddingRight)
	)
}

/**
 * The page under `fit="width"` takes its width from the measured viewport. A plain `setState`
 * from the observer committed that width a frame after the paint. Thus each frame that
 * narrowed the viewport painted the page at the width of the frame before, past the edge of
 * the viewport. A thumbnail rail that slides open beside the page did that on each frame of
 * the slide.
 *
 * A second observer, made after the viewer's own, runs after it in each delivery. It thus
 * reads the layout that the frame paints.
 */
describe('pdf viewer fit to width on a resize (real browser)', () => {
	it('paints the page at the new width in the frame that narrows the viewport', async () => {
		const src = servePdfFor(makeInvoicePdf(1))

		const { container } = renderUI(
			<div style={{ display: 'flex', width: 900 }}>
				<div data-testid="rail" style={{ flexShrink: 0, width: 0 }} />
				<div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
					<PdfViewer src={src} fit="width" className="h-96 w-full" aria-label="Invoice" />
				</div>
			</div>,
		)

		const frame = present((await pageImage(container)).parentElement, 'the page frame')

		const viewport = getSlot(container, 'pdf-viewer-viewport')

		await waitFor(() =>
			expect(frame.getBoundingClientRect().width).toBeCloseTo(contentWidth(viewport), 0),
		)

		const gaps: number[] = []

		const probe = new ResizeObserver(() => {
			gaps.push(frame.getBoundingClientRect().width - contentWidth(viewport))
		})

		probe.observe(viewport)

		onTestFinished(() => probe.disconnect())

		const rail = present(container.querySelector<HTMLElement>('[data-testid="rail"]'), 'rail')

		// A step in each frame, as a slide makes.
		for (const width of [56, 112, 168, 224]) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => {
					rail.style.width = `${width}px`

					resolve()
				}),
			)
		}

		await frames()

		// The first delivery of the probe reads the start, and the later ones read the steps.
		expect(gaps.length).toBeGreaterThan(1)

		for (const gap of gaps) expect(Math.abs(gap)).toBeLessThanOrEqual(1)
	})
})
