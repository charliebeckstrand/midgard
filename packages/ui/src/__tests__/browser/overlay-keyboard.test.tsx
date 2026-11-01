import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../components/drawer'
import { Input } from '../../components/input'
import { Overlay } from '../../primitives/overlay'
import { act, getSlot, renderUI } from '../helpers'

/**
 * A modal overlay on a phone with the on-screen keyboard up.
 *
 * On iOS, the keyboard does not make the layout viewport smaller. Only the
 * visual viewport gets smaller, and the keyboard covers the bottom of the page.
 * A drawer on the bottom edge of a box fixed to the viewport went behind the
 * keyboard, and a touch on the backdrop panned the page under the overlay.
 *
 * Chromium shows no keyboard, so each case sets the height of the visual
 * viewport and sends its `resize`.
 */

const KEYBOARD = 300

/**
 * Sets the height of the visual viewport and sends its `resize`. A height
 * `KEYBOARD` pixels under the window is the keyboard up.
 */
function setViewportHeight(height: number) {
	vi.spyOn(VisualViewport.prototype, 'height', 'get').mockReturnValue(height)

	act(() => {
		window.visualViewport?.dispatchEvent(new Event('resize'))
	})
}

function renderDrawer() {
	renderUI(
		<Drawer open onOpenChange={() => {}}>
			<DrawerPanel height="fit" aria-label="Edit">
				<DrawerTitle>Edit</DrawerTitle>
				<DrawerBody>
					<Input aria-label="Name" />
				</DrawerBody>
			</DrawerPanel>
		</Drawer>,
	)

	return getSlot(document.body, 'drawer')
}

describe('overlay with the on-screen keyboard', () => {
	it('keeps a drawer above the keyboard', () => {
		const panel = renderDrawer()

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)

		setViewportHeight(window.innerHeight - KEYBOARD)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - KEYBOARD, 0)
	})

	it('keeps the backdrop over the full viewport, under the keyboard too', () => {
		renderDrawer()

		setViewportHeight(window.innerHeight - KEYBOARD)

		const backdrop = getSlot(document.body, 'overlay-backdrop').getBoundingClientRect()

		expect(backdrop.top).toBeCloseTo(0, 0)

		expect(backdrop.bottom).toBeCloseTo(window.innerHeight, 0)
	})

	it('gives the full viewport back when the keyboard goes down', () => {
		const panel = renderDrawer()

		setViewportHeight(window.innerHeight - KEYBOARD)

		setViewportHeight(window.innerHeight)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
	})

	// A modal overlay stops a touch pan of the page under it. A non-modal one
	// leaves the touch actions of the page.
	it.each([
		{ modal: true, touchAction: 'none' },
		{ modal: false, touchAction: 'auto' },
	])('sets touch-action $touchAction on an overlay with modal $modal', ({ modal, touchAction }) => {
		renderUI(
			<Overlay open modal={modal} onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(getComputedStyle(getSlot(document.body, 'overlay')).touchAction).toBe(touchAction)
	})
})
