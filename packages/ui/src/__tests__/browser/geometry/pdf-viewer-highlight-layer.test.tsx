import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	PdfViewer,
	type PdfViewerHighlight,
	type PdfViewerPage,
} from '../../../components/pdf-viewer'
import { bySlot, fireEvent, getSlot, noop, present, renderUI, screen, waitFor } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The overlay's one geometry invariant, in a real browser: the highlight layer is the page
 * image's twin — same box, same transform — which is what lets a region positioned in
 * percentages of the layer land on the same ink at every zoom and every rotation, with no
 * per-region arithmetic.
 *
 * It is asserted here because nothing else can assert it. The two boxes are written in two
 * files — the image in `pdf-viewer-viewport.tsx`, the layer in `pdf-viewer-highlights.tsx` —
 * and each carries its own style object and its own kata entry, so four sites have to agree
 * and only computed layout says whether they do. `use-pdf-viewer-page-scale.test.ts` proves
 * the transform string both of them read; it cannot prove that both of them read it.
 */

// The scale transform rounds the edges of the two boxes, so an edge can move by this much.
const SAME_BOX = 0.1

const PAGE_WIDTH = 816

const PAGE_HEIGHT = 1056

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}"><rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff" /></svg>`

const pages: PdfViewerPage[] = [
	{
		id: 'a',
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		label: 'Page 1',
		// Caller-supplied, so the page is measurable before the image decodes.
		width: PAGE_WIDTH,
		height: PAGE_HEIGHT,
	},
]

/** A quarter-page box a quarter in: no two edges share a fraction, so a swapped axis shows. */
const rect = { x: 0.25, y: 0.5, width: 0.5, height: 0.25 }

const highlights: PdfViewerHighlight[] = [{ id: 'total', page: 1, rect, label: 'Total charges' }]

describe('pdf-viewer highlight layer (real browser)', () => {
	beforeAll(() => page.viewport(1200, 900))

	/** Renders the viewer in a bounded box and waits for the page to be measured and laid out. */
	async function viewer() {
		const { container } = renderUI(
			<div style={{ width: 700 }}>
				<PdfViewer pages={pages} highlights={highlights} onActiveHighlightChange={noop} />
			</div>,
		)

		const image = present<HTMLImageElement>(
			bySlot(container, 'pdf-viewer-page-frame')?.querySelector('img'),
			'the page image',
		)

		await waitFor(() => expect(image.getBoundingClientRect().width).toBeGreaterThan(0))

		return { container, image }
	}

	function layerOf(container: HTMLElement) {
		return getSlot(container, 'pdf-viewer-highlights')
	}

	it('draws the layer over the page image, edge for edge', async () => {
		const { container, image } = await viewer()

		expect(layerOf(container)).toMatchBox(image, { tolerance: SAME_BOX })
	})

	it('keeps them one box through a zoom step', async () => {
		const { container, image } = await viewer()

		const before = image.getBoundingClientRect().width

		fireEvent.click(screen.getByLabelText('Zoom in'))

		await waitFor(() => expect(image.getBoundingClientRect().width).toBeGreaterThan(before))

		expect(layerOf(container)).toMatchBox(image, { tolerance: SAME_BOX })
	})

	it('keeps them one box through a rotation', async () => {
		const { container, image } = await viewer()

		const upright = image.getBoundingClientRect().height

		fireEvent.click(screen.getByLabelText('Rotate'))

		// The image keeps its own width and height under `rotate()`; the frame around it is
		// what transposes. So wait on the frame, which is the box that visibly changes.
		const frame = getSlot(container, 'pdf-viewer-page-frame')

		await waitFor(() =>
			expect(frame.getBoundingClientRect().height).not.toBeNear(upright, HALF_PIXEL),
		)

		expect(layerOf(container)).toMatchBox(image, { tolerance: SAME_BOX })
	})

	it('lands a region on the fraction of the page it names', async () => {
		const { image } = await viewer()

		const box = image.getBoundingClientRect()

		const region = screen.getByLabelText('Total charges')

		const left = box.left + rect.x * box.width

		const top = box.top + rect.y * box.height

		expect(region).toMatchBox(
			{
				left,
				top,
				right: left + rect.width * box.width,
				bottom: top + rect.height * box.height,
			},
			{ tolerance: SAME_BOX },
		)
	})
})
