import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../components/drawer'
import { Input } from '../../components/input'
import { Overlay } from '../../primitives/overlay'
import { act, getSlot, renderUI, screen } from '../helpers'

/**
 * A modal overlay on a phone with the on-screen keyboard up.
 *
 * On iOS, the keyboard does not make the layout viewport smaller. Only the
 * visual viewport gets smaller, and the keyboard covers the bottom of the page.
 * A drawer on the bottom edge of a box fixed to the viewport went behind the
 * keyboard, and a touch on the backdrop panned the page under the overlay.
 *
 * The box follows only the keyboard of a field in it. The keyboard of the
 * address bar of iOS Chrome also makes the visual viewport smaller, and a
 * drawer that followed it changed height behind the address bar, then
 * stepped back to the full viewport.
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

/** Moves the focus to the field in the drawer, so the keyboard is for the drawer. */
function focusField() {
	act(() => {
		screen.getByRole('textbox', { name: 'Name' }).focus()
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

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - KEYBOARD, 0)
	})

	it('keeps the backdrop over the full viewport, under the keyboard too', () => {
		renderDrawer()

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		const backdrop = getSlot(document.body, 'overlay-backdrop').getBoundingClientRect()

		expect(backdrop.top).toBeCloseTo(0, 0)

		expect(backdrop.bottom).toBeCloseTo(window.innerHeight, 0)
	})

	it('gives the full viewport back when the keyboard goes down', () => {
		const panel = renderDrawer()

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		setViewportHeight(window.innerHeight)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
	})

	// The keyboard of the address bar, with the focus on a button in the drawer.
	it('keeps the full viewport for a keyboard that is not for a field in the box', () => {
		const panel = renderDrawer()

		const { height } = panel.getBoundingClientRect()

		setViewportHeight(window.innerHeight - KEYBOARD)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)

		expect(panel.getBoundingClientRect().height).toBeCloseTo(height, 0)
	})

	// A tap on Close takes the focus from the field when the press starts. If the
	// box moved then, Close would move out from under the finger, and the tap
	// would not click it.
	it('keeps the box over the keyboard when the field loses the focus', () => {
		const panel = renderDrawer()

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		act(() => {
			screen.getByRole('textbox', { name: 'Name' }).blur()
		})

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - KEYBOARD, 0)
	})

	it('closes on the first press of Close with the keyboard up', async ({ signal }) => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer open onOpenChange={onOpenChange}>
				<DrawerPanel aria-label="Search">
					<DrawerBody>
						<Input aria-label="Name" />
					</DrawerBody>
				</DrawerPanel>
			</Drawer>,
		)

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		await userEvent.click(screen.getByRole('button', { name: 'Close' }))

		signal.throwIfAborted()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('stops following the visual viewport when the keyboard goes down', () => {
		const panel = renderDrawer()

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		act(() => {
			screen.getByRole('textbox', { name: 'Name' }).blur()
		})

		setViewportHeight(window.innerHeight)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)

		// A later keyboard with no field in focus is not for the box.
		setViewportHeight(window.innerHeight - KEYBOARD)

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
	})

	// A non-modal overlay leaves the page fields in reach. iOS keeps the keyboard
	// up when the focus moves to one of them, and the keyboard is then the page's.
	it('gives the full viewport back when a field on the page takes the keyboard', () => {
		renderUI(
			<>
				<Input aria-label="Page" />
				<Drawer open onOpenChange={() => {}}>
					<DrawerPanel modal={false} aria-label="Edit">
						<DrawerBody>
							<Input aria-label="Name" />
						</DrawerBody>
					</DrawerPanel>
				</Drawer>
			</>,
		)

		const panel = getSlot(document.body, 'drawer')

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		act(() => {
			screen.getByRole('textbox', { name: 'Page' }).focus()
		})

		expect(panel.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
	})

	it('gives the full viewport back when the browser takes the focus', () => {
		const panel = renderDrawer()

		focusField()

		setViewportHeight(window.innerHeight - KEYBOARD)

		act(() => {
			window.dispatchEvent(new FocusEvent('blur'))
		})

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
