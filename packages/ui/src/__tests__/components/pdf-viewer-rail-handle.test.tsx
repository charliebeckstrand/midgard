import { beforeEach, describe, expect, it } from 'vitest'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { BREAKPOINT_WIDTHS } from '../../utilities/responsive'
import { allBySlot, fireEvent, getSlot, renderUI, screen, stubMatchMedia } from '../helpers'

beforeEach(() => {
	// A wide viewport, so the thumbnails are a rail and not a Sheet.
	stubMatchMedia((query) => query === `(min-width: ${BREAKPOINT_WIDTHS.lg})`)
})

const pages: PdfViewerPage[] = [
	{ id: 'a', src: 'page-1.png', label: 'Page 1' },
	{ id: 'b', src: 'page-2.png', label: 'Page 2' },
	{ id: 'c', src: 'page-3.png', label: 'Page 3' },
]

function renderRail(dir?: 'rtl') {
	const { container } = renderUI(
		<div dir={dir}>
			<PdfViewer pages={pages} />
		</div>,
	)

	const rail = getSlot(container, 'pdf-viewer-sidebar')

	const handle = screen.getByRole('separator', { name: 'Resize pages' })

	return { container, rail, handle }
}

/** The width that the handle wrote on the rail. */
function railWidth(rail: HTMLElement) {
	return rail.style.getPropertyValue('--pdf-viewer-rail')
}

describe('PdfViewer rail resize handle', () => {
	it('opens at the default width, and reports the bounds and the rail', () => {
		const { rail, handle } = renderRail()

		expect(handle).toHaveAttribute('aria-orientation', 'vertical')

		expect(handle).toHaveAttribute('aria-valuenow', '240')

		expect(handle).toHaveAttribute('aria-valuemin', '160')

		expect(handle).toHaveAttribute('aria-valuemax', '320')

		expect(handle).toHaveAttribute('aria-valuetext', '240 pixels')

		expect(handle).toHaveAttribute('aria-controls', rail.id)

		expect(railWidth(rail)).toBe('240px')
	})

	it('steps the width with the arrow keys and PageUp and PageDown', () => {
		const { rail, handle } = renderRail()

		fireEvent.keyDown(handle, { key: 'ArrowRight' })

		expect(handle).toHaveAttribute('aria-valuenow', '248')

		fireEvent.keyDown(handle, { key: 'ArrowLeft' })
		fireEvent.keyDown(handle, { key: 'ArrowLeft' })

		expect(handle).toHaveAttribute('aria-valuenow', '232')

		fireEvent.keyDown(handle, { key: 'PageUp' })

		expect(handle).toHaveAttribute('aria-valuenow', '264')

		fireEvent.keyDown(handle, { key: 'PageDown' })

		expect(handle).toHaveAttribute('aria-valuenow', '232')

		expect(railWidth(rail)).toBe('232px')
	})

	it('sets the bounds with Home and End, and clamps a step to them', () => {
		const { rail, handle } = renderRail()

		fireEvent.keyDown(handle, { key: 'End' })

		expect(handle).toHaveAttribute('aria-valuenow', '320')

		fireEvent.keyDown(handle, { key: 'PageUp' })

		expect(handle).toHaveAttribute('aria-valuenow', '320')

		fireEvent.keyDown(handle, { key: 'Home' })

		expect(handle).toHaveAttribute('aria-valuenow', '160')

		fireEvent.keyDown(handle, { key: 'ArrowLeft' })

		expect(handle).toHaveAttribute('aria-valuenow', '160')

		expect(railWidth(rail)).toBe('160px')
	})

	// The rail moves focus between its tiles on Home and End, but only for a key from a tile. A
	// rail that took a key from any of its nodes would move focus off the handle here.
	it('keeps focus on the handle for a key that resizes', () => {
		const { container, handle } = renderRail()

		handle.focus()

		fireEvent.keyDown(handle, { key: 'Home' })

		expect(handle).toHaveFocus()

		fireEvent.keyDown(handle, { key: 'End' })

		expect(handle).toHaveFocus()

		expect(allBySlot(container, 'pdf-viewer-thumbnail')[0]).not.toHaveFocus()
	})

	it('leaves a key with a browser modifier to the browser', () => {
		const { handle } = renderRail()

		fireEvent.keyDown(handle, { key: 'ArrowRight', altKey: true })

		expect(handle).toHaveAttribute('aria-valuenow', '240')
	})

	it('mirrors the horizontal arrows in a right-to-left layout', () => {
		const { handle } = renderRail('rtl')

		fireEvent.keyDown(handle, { key: 'ArrowLeft' })

		expect(handle).toHaveAttribute('aria-valuenow', '248')
	})

	it('resizes the rail with a drag of the primary pointer, within the bounds', () => {
		const { rail, handle } = renderRail()

		fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 240 })

		expect(handle).toHaveAttribute('data-dragging')

		fireEvent.pointerMove(handle, { pointerId: 1, clientX: 280 })

		expect(handle).toHaveAttribute('aria-valuenow', '280')

		// A second pointer does not move the edge.
		fireEvent.pointerMove(handle, { pointerId: 2, clientX: 200 })

		expect(handle).toHaveAttribute('aria-valuenow', '280')

		fireEvent.pointerMove(handle, { pointerId: 1, clientX: 900 })

		expect(handle).toHaveAttribute('aria-valuenow', '320')

		// A browser fires this after `pointerup`. jsdom does not.
		fireEvent.lostPointerCapture(handle, { pointerId: 1 })

		expect(handle).not.toHaveAttribute('data-dragging')

		fireEvent.pointerMove(handle, { pointerId: 1, clientX: 200 })

		expect(railWidth(rail)).toBe('320px')
	})

	it('mirrors the drag in a right-to-left layout', () => {
		const { handle } = renderRail('rtl')

		fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 500 })

		fireEvent.pointerMove(handle, { pointerId: 1, clientX: 460 })

		expect(handle).toHaveAttribute('aria-valuenow', '280')
	})

	it('ignores a press that is not a plain primary press', () => {
		const { handle } = renderRail()

		fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 2, clientX: 240 })

		fireEvent.pointerMove(handle, { pointerId: 1, clientX: 280 })

		expect(handle).not.toHaveAttribute('data-dragging')

		expect(handle).toHaveAttribute('aria-valuenow', '240')
	})

	it('sets the default width again on a double-click', () => {
		const { handle } = renderRail()

		fireEvent.keyDown(handle, { key: 'Home' })

		fireEvent.doubleClick(handle)

		expect(handle).toHaveAttribute('aria-valuenow', '240')
	})

	it('keeps the width when the rail collapses and opens again', () => {
		const { rail, handle } = renderRail()

		fireEvent.keyDown(handle, { key: 'Home' })

		fireEvent.click(screen.getByLabelText('Hide thumbnails'))

		fireEvent.click(screen.getByLabelText('Show thumbnails'))

		expect(railWidth(rail)).toBe('160px')
	})
})
