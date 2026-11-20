import { describe, expect, it } from 'vitest'
import { makeInvoicePdf } from '../../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../../components/pdf-viewer'
import { frame, frames, getSlot, present, renderUI } from '../../helpers'
import { pageImage, servePdfFor } from '../helpers/pdf-viewer'

/** The zoom of the case: a step of the default zoom levels. */
const ZOOM = 1.25

/**
 * The page under `fit="page"` takes its size from the viewport. A viewer that measured the
 * client box got a box less a scrollbar that shows. A zoomed page
 * overflows the viewport, and the overflow gives the viewport scrollbars. The scrollbars made
 * the fitted page smaller. In a band of widths, the smaller page stopped the overflow on one
 * axis, and that scrollbar went. The page then grew again. Thus the page changed between two
 * sizes on each frame, and the browser reported a `ResizeObserver` loop. At 125%, in a host
 * 1272 px to 1284 px wide, the page changed between 1236 px and 1222 px wide. The page now
 * reads the container units of the pane around the scroll box, which a scrollbar does not change.
 *
 * The case runs with real scrollbars (the `scrollbars` instance of `vitest.browser.config.ts`).
 * With hidden scrollbars, a scrollbar has no width, so the loop cannot start.
 */
describe('pdf viewer fit to page with zoom (real browser, real scrollbars)', () => {
	it('holds the size of the zoomed page at each width near the edge of the overflow', async () => {
		const src = servePdfFor(makeInvoicePdf(1))

		const { container } = renderUI(
			<div data-testid="host" style={{ width: 1240 }}>
				<PdfViewer src={src} fit="page" defaultZoom={ZOOM} aria-label="Invoice" />
			</div>,
		)

		const page = present((await pageImage(container)).parentElement, 'the page frame')

		const viewport = getSlot(container, 'pdf-viewer-viewport')

		const host = present(container.querySelector<HTMLElement>('[data-testid="host"]'), 'host')

		const unsteady: string[] = []

		const offScale: string[] = []

		for (let width = 1240; width <= 1320; width += 4) {
			host.style.width = `${width}px`

			await frames()

			const widths = new Set<number>()

			for (let i = 0; i < 4; i++) {
				await frame()

				widths.add(Math.round(page.getBoundingClientRect().width))
			}

			if (widths.size > 1) unsteady.push(`${width}: ${[...widths].join(' and ')}`)

			// The page at 100% fits the viewport with no scrollbar. The zoom multiplies that page.
			const style = getComputedStyle(viewport)

			const roomX =
				viewport.offsetWidth -
				Number.parseFloat(style.paddingLeft) -
				Number.parseFloat(style.paddingRight)

			const roomY =
				viewport.offsetHeight -
				Number.parseFloat(style.paddingTop) -
				Number.parseFloat(style.paddingBottom)

			const box = page.getBoundingClientRect()

			const fitted = Math.min(roomX, roomY * (box.width / box.height))

			if (Math.abs(box.width - fitted * ZOOM) > 1) {
				offScale.push(`${width}: ${box.width} for ${fitted * ZOOM}`)
			}
		}

		expect(unsteady).toEqual([])

		expect(offScale).toEqual([])
	})
})
