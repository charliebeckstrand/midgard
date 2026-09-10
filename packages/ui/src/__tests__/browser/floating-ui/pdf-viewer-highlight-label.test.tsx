import { describe, expect, it } from 'vitest'
import {
	PdfViewer,
	type PdfViewerHighlight,
	type PdfViewerPage,
} from '../../../components/pdf-viewer'
import { fireEvent, noop, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * The selected region's name, against real layout and the real floating engine.
 *
 * Everything about where this label lands is invisible to the jsdom suite, which mocks
 * `@floating-ui/react` down to a no-op `setReference` and measures every rect as zero. What
 * that suite can prove is that the right string appears, disappears with the overlay, and
 * follows the selection. What only a browser can prove is the part the label exists for: that
 * it sits clear of the box it names, and that the two transforms between it and the page —
 * the layer's `rotate()` and the viewport's own scrolling — do not carry it off screen.
 */
describe('pdf viewer highlight label (real browser)', () => {
	const pages: PdfViewerPage[] = [
		{
			id: 'a',
			// A 1x1 transparent GIF: a real decodable image, so the page frame takes a size
			// without a network fetch. The point size is what the regions are measured against.
			src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
			label: 'Page 1',
			pointWidth: 612,
			pointHeight: 792,
		},
	]

	/** Mid-page, so there is room above it for the label either way the engine flips. */
	const highlights: PdfViewerHighlight[] = [
		{
			id: 'total',
			page: 1,
			rect: { x: 0.2, y: 0.45, width: 0.35, height: 0.05 },
			label: 'Total charges',
		},
	]

	function setup() {
		return renderUI(
			<div style={{ width: '520px', height: '620px' }}>
				<PdfViewer pages={pages} highlights={highlights} onActiveHighlightChange={noop} />
			</div>,
		)
	}

	const label = () =>
		document.querySelector<HTMLElement>('[data-slot="pdf-viewer-highlight-label"]')

	it('draws the name clear of the region it names, and inside the viewer', async () => {
		const { container } = setup()

		// Awaited: the layer draws nothing until the viewport has been measured and the page
		// image has decoded, neither of which has happened by the end of the first commit.
		const region = await screen.findByLabelText('Total charges')

		fireEvent.mouseDown(region)

		await waitFor(() => expect(label()).toBeInTheDocument())

		// The panel is what carries the position; the span inside it is what carries the name.
		const panel = present(label()?.closest('[data-slot="tooltip-content"]'), 'the label panel')

		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))

		const name = panel.getBoundingClientRect()

		const box = region.getBoundingClientRect()

		// Above the region — the placement asked for — and not overlapping it, which is the
		// whole point: a name drawn over the box hides the very content being checked.
		expect(name.bottom).toBeLessThanOrEqual(box.top + 1)

		// Roughly centred on the box it names, so which region it belongs to is unambiguous
		// even where two sit close together.
		expect(Math.abs((name.left + name.right) / 2 - (box.left + box.right) / 2)).toBeLessThan(24)

		// Still on screen. The layer it is declared inside is transformed and clipped by a
		// scrolling viewport; a label that inherited either would land outside the viewer.
		const viewer = present(container.querySelector('[data-slot="pdf-viewer"]'), 'the viewer')

		const frame = viewer.getBoundingClientRect()

		expect(name.top).toBeGreaterThanOrEqual(frame.top - 1)

		expect(name.left).toBeGreaterThanOrEqual(frame.left - 1)

		expect(name.right).toBeLessThanOrEqual(frame.right + 1)
	})

	/*
	 * The region keeps the focus a press or a roving key put on it. The label anchors to that
	 * same element, so the one thing it must not do is replace it — an earlier shape of this
	 * wrapped the active region in a `<Tooltip>`, which changed the element at that position
	 * and remounted it mid-selection.
	 */
	it('leaves the region it names focused and in place', async () => {
		setup()

		const region = await screen.findByLabelText('Total charges')

		region.focus()

		fireEvent.mouseDown(region)

		await waitFor(() => expect(label()).toBeInTheDocument())

		expect(screen.getByLabelText('Total charges')).toBe(region)

		expect(document.activeElement).toBe(region)
	})
})
