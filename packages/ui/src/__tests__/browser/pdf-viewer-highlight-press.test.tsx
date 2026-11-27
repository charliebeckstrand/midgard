import { describe, expect, it, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { PdfViewer, type PdfViewerHighlight, type PdfViewerPage } from '../../components/pdf-viewer'
import { renderUI, screen } from '../helpers'
import { press } from './helpers/drag'

/**
 * A press on a highlight region acts on its release (WCAG 2.5.2, Pointer Cancellation).
 *
 * Each case presses the real mouse, so the browser builds the events and picks the target of the
 * click. A press that moves off its region before the release sends its click to the nearest
 * element that holds both ends. The jsdom suite can only guess that target.
 */
describe('pdf viewer highlight press (real browser)', () => {
	const pages: PdfViewerPage[] = [
		{
			id: 'a',
			// A 1x1 transparent GIF: a real image that decodes with no network fetch.
			src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
			label: 'Page 1',
			pointWidth: 612,
			pointHeight: 792,
		},
	]

	/** One region near the top and one near the bottom, so the middle of the page is clear. */
	const highlights: PdfViewerHighlight[] = [
		{
			id: 'total',
			page: 1,
			rect: { x: 0.2, y: 0.1, width: 0.35, height: 0.05 },
			label: 'Total charges',
		},
		{
			id: 'invoice',
			page: 1,
			rect: { x: 0.2, y: 0.8, width: 0.35, height: 0.05 },
			label: 'Invoice number',
		},
	]

	/** The layer over the page. Its middle is clear of both regions. */
	const PAGE = '[data-slot="pdf-viewer-highlights"]'

	function setup() {
		const onActiveHighlightIdChange = vi.fn()

		const onHighlightClick = vi.fn()

		renderUI(
			<div style={{ width: '520px', height: '620px' }}>
				<PdfViewer
					pages={pages}
					highlights={highlights}
					onActiveHighlightIdChange={onActiveHighlightIdChange}
					onHighlightClick={onHighlightClick}
				/>
			</div>,
		)

		return { onActiveHighlightIdChange, onHighlightClick }
	}

	it('selects nothing for a press that moves off the region before its release', async () => {
		const { onActiveHighlightIdChange, onHighlightClick } = setup()

		const region = await screen.findByLabelText('Total charges')

		await press('[aria-label="Total charges"]')

		await commands.releasePointer(PAGE)

		expect(region).not.toHaveAttribute('aria-current')

		expect(onActiveHighlightIdChange).not.toHaveBeenCalled()

		expect(onHighlightClick).not.toHaveBeenCalled()
	})

	it('keeps the selection through a press that moves off another region', async () => {
		const { onActiveHighlightIdChange, onHighlightClick } = setup()

		const total = await screen.findByLabelText('Total charges')

		await userEvent.click(total)

		expect(total).toHaveAttribute('aria-current', 'true')

		onActiveHighlightIdChange.mockClear()

		onHighlightClick.mockClear()

		await press('[aria-label="Invoice number"]')

		await commands.releasePointer(PAGE)

		expect(total).toHaveAttribute('aria-current', 'true')

		expect(onActiveHighlightIdChange).not.toHaveBeenCalled()

		expect(onHighlightClick).not.toHaveBeenCalled()
	})

	it('keeps the selection through a press that moves from the page onto a region', async () => {
		const { onActiveHighlightIdChange } = setup()

		const total = await screen.findByLabelText('Total charges')

		await userEvent.click(total)

		onActiveHighlightIdChange.mockClear()

		await press(PAGE)

		await commands.releasePointer('[aria-label="Invoice number"]')

		expect(total).toHaveAttribute('aria-current', 'true')

		expect(onActiveHighlightIdChange).not.toHaveBeenCalled()
	})

	it('clears the selection on a click on the page', async () => {
		const { onActiveHighlightIdChange } = setup()

		const total = await screen.findByLabelText('Total charges')

		await userEvent.click(total)

		await press(PAGE)

		// The press alone puts nothing down. The release does.
		expect(total).toHaveAttribute('aria-current', 'true')

		await commands.releasePointer()

		expect(total).not.toHaveAttribute('aria-current')

		expect(onActiveHighlightIdChange).toHaveBeenLastCalledWith(null)
	})
})
