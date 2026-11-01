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

/** Makes the visual viewport `KEYBOARD` pixels shorter than the window, as the keyboard does. Returns the spy on its height. */
function raiseKeyboard() {
	const viewport = window.visualViewport

	if (!viewport) throw new Error('no visualViewport')

	const height = vi
		.spyOn(VisualViewport.prototype, 'height', 'get')
		.mockReturnValue(window.innerHeight - KEYBOARD)

	act(() => {
		viewport.dispatchEvent(new Event('resize'))
	})

	return height
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

		raiseKeyboard()

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - KEYBOARD, 0)
	})

	it('keeps the backdrop over the full viewport, under the keyboard too', () => {
		renderDrawer()

		raiseKeyboard()

		const backdrop = getSlot(document.body, 'overlay-backdrop').getBoundingClientRect()

		expect(backdrop.top).toBeCloseTo(0, 0)

		expect(backdrop.bottom).toBeCloseTo(window.innerHeight, 0)
	})

	it('gives the full viewport back when the keyboard goes down', () => {
		const panel = renderDrawer()

		const height = raiseKeyboard()

		height.mockReturnValue(window.innerHeight)

		act(() => {
			window.visualViewport?.dispatchEvent(new Event('resize'))
		})

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
	})

	it('stops a touch pan of the page under a modal overlay', () => {
		renderUI(
			<Overlay open onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(getComputedStyle(getSlot(document.body, 'overlay')).touchAction).toBe('none')
	})

	it('leaves the touch actions of a non-modal overlay', () => {
		renderUI(
			<Overlay open modal={false} onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(getComputedStyle(getSlot(document.body, 'overlay')).touchAction).toBe('auto')
	})
})
