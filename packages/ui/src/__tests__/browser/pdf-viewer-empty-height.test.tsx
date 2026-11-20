import { describe, expect, it } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import { getSlot, renderUI, screen } from '../helpers'

/**
 * A viewer with no page shows a message and no page frame. Only a frame needs the pane to be a
 * size container. A size container that held the message took no height from it, so the pane
 * was as tall as its padding and clipped the message.
 */
describe('pdf viewer with no page (real browser)', () => {
	it('grows the pane to the height of the message', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<PdfViewer pages={[]} aria-label="Document" />
			</div>,
		)

		const pane = getSlot(container, 'pdf-viewer-pane')

		const message = screen.getByText('No pages to display')

		const paneBox = pane.getBoundingClientRect()

		const messageBox = message.getBoundingClientRect()

		expect(messageBox.height).toBeGreaterThan(0)

		// Inside the content box of the pane, not in its padding.
		const style = getComputedStyle(pane)

		expect(messageBox.top).toBeGreaterThanOrEqual(paneBox.top + Number.parseFloat(style.paddingTop))

		expect(messageBox.bottom).toBeLessThanOrEqual(
			paneBox.bottom - Number.parseFloat(style.paddingBottom),
		)
	})
})
