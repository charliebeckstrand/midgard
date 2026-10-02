import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../../../components/dialog'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { Sheet } from '../../../components/sheet'
import { Toast } from '../../../components/toast'
import { ToastProvider } from '../../../providers/toast'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * Real-browser check of the surfaces on the bottom edge of the visible frame.
 *
 * Chrome on iOS lays the page out under its toolbars, and shows the covered
 * part only through the visual viewport. An iOS keyboard covers the bottom edge
 * in the same way. `useVisualViewport` reads the frame, and each surface fixed
 * to the viewport takes it as its box. The visual viewport of the test browser
 * has no toolbar, so a stub stands in for it. Each box is an arbitrary Tailwind
 * value, and only a real browser shows that it applies. The page is 414 px
 * wide, so each surface takes its phone layout.
 */

/** The toolbar the stub puts over the bottom of the screen, in pixels. */
const TOOLBAR = 60

/** A keyboard over the bottom of the screen, in pixels. */
const KEYBOARD = 300

/** Stubs a visual viewport that stops `covered` pixels short of the layout viewport. */
function stubCovered(covered: number) {
	vi.stubGlobal(
		'visualViewport',
		Object.assign(new EventTarget(), {
			offsetTop: 0,
			height: window.innerHeight - covered,
			scale: 1,
		}),
	)
}

/** The bottom edge of the visible frame under a strip of `covered` pixels. */
function frameBottom(covered: number): number {
	return window.innerHeight - covered
}

/** Renders an open drawer of the given height, with a heading and a short body. */
function renderDrawer(height?: 'auto' | 'full') {
	renderUI(
		<Drawer
			open
			handle
			height={height}
			animateOnMount={false}
			onOpenChange={() => {}}
			aria-label="Options"
		>
			<DrawerHeader>
				<DrawerTitle>Options</DrawerTitle>
			</DrawerHeader>

			<DrawerBody>
				<div data-testid="rows" className="h-48">
					Rows
				</div>
			</DrawerBody>
		</Drawer>,
	)

	return {
		panel: getSlot(document.body, 'drawer'),
		rows: present(document.querySelector<HTMLElement>('[data-testid="rows"]'), 'rows'),
	}
}

describe('surfaces on the bottom edge of the visible frame (real browser)', () => {
	it('docks a drawer on top of the toolbar', async () => {
		stubCovered(TOOLBAR)

		const { panel, rows } = renderDrawer()

		await frames()

		expect(panel.getBoundingClientRect().bottom).toBeNear(frameBottom(TOOLBAR), HALF_PIXEL)

		expect(rows.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			frameBottom(TOOLBAR) + HALF_PIXEL,
		)
	})

	it('docks a drawer on top of the toolbar on a page that is scrolled down', async () => {
		// The case of the report: the page scrolled, and then the sheet opened.
		const filler = document.body.appendChild(document.createElement('div'))

		filler.style.height = '3000px'

		window.scrollTo(0, 400)

		stubCovered(TOOLBAR)

		const { panel } = renderDrawer()

		await frames()

		expect(panel.getBoundingClientRect().bottom).toBeNear(frameBottom(TOOLBAR), HALF_PIXEL)

		filler.remove()
	})

	it('fits a full drawer to the frame, not the screen', async () => {
		stubCovered(TOOLBAR)

		const { panel } = renderDrawer('full')

		await frames()

		const box = panel.getBoundingClientRect()

		expect(box.top).toBeNear(0, HALF_PIXEL)

		expect(box.height).toBeNear(frameBottom(TOOLBAR), HALF_PIXEL)
	})

	it('docks a drawer on top of a keyboard', async () => {
		stubCovered(KEYBOARD)

		const { panel } = renderDrawer()

		await frames()

		expect(panel.getBoundingClientRect().bottom).toBeNear(frameBottom(KEYBOARD), HALF_PIXEL)
	})

	it('docks a drawer on the bottom of the screen when nothing covers it', async () => {
		const { panel } = renderDrawer()

		await frames()

		expect(panel.getBoundingClientRect().bottom).toBeNear(window.innerHeight, HALF_PIXEL)

		expect(document.documentElement.style.getPropertyValue('--visual-viewport-height')).toBe('')
	})

	it('keeps the backdrop on the full screen, under the toolbar too', async () => {
		stubCovered(TOOLBAR)

		renderDrawer()

		await frames()

		const backdrop = getSlot(document.body, 'overlay-backdrop').getBoundingClientRect()

		expect(backdrop.top).toBeNear(0, HALF_PIXEL)

		expect(backdrop.bottom).toBeNear(window.innerHeight, HALF_PIXEL)
	})

	it('docks a phone dialog on top of the toolbar', async () => {
		stubCovered(TOOLBAR)

		renderUI(
			<Dialog open onOpenChange={() => {}} aria-label="Confirm">
				Body
			</Dialog>,
		)

		await frames()

		expect(getSlot(document.body, 'dialog').getBoundingClientRect().bottom).toBeNear(
			frameBottom(TOOLBAR),
			HALF_PIXEL,
		)
	})

	it('docks a bottom sheet on top of the toolbar', async () => {
		stubCovered(TOOLBAR)

		renderUI(
			<Sheet open side="bottom" onOpenChange={() => {}} aria-label="Filters">
				Body
			</Sheet>,
		)

		await frames()

		expect(getSlot(document.body, 'sheet').getBoundingClientRect().bottom).toBeNear(
			frameBottom(TOOLBAR),
			HALF_PIXEL,
		)
	})

	it('runs a side sheet down to the toolbar', async () => {
		stubCovered(TOOLBAR)

		renderUI(
			<Sheet open side="right" onOpenChange={() => {}} aria-label="Filters">
				Body
			</Sheet>,
		)

		await frames()

		expect(getSlot(document.body, 'sheet').getBoundingClientRect().bottom).toBeNear(
			frameBottom(TOOLBAR),
			HALF_PIXEL,
		)
	})

	it('keeps the toast stack 1rem above the toolbar', async () => {
		stubCovered(TOOLBAR)

		renderUI(
			<ToastProvider>
				<Toast />
			</ToastProvider>,
		)

		await frames()

		const stack = getSlot(document.body, 'toast-viewport')

		expect(stack.getBoundingClientRect().bottom).toBeNear(frameBottom(TOOLBAR), HALF_PIXEL)

		expect(Number.parseFloat(getComputedStyle(stack).paddingBottom)).toBeNear(16, HALF_PIXEL)
	})
})
