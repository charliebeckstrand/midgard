import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../../../components/dialog'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { Sheet } from '../../../components/sheet'
import { Toast } from '../../../components/toast'
import { ToastProvider } from '../../../providers/toast'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * Real-browser check of the surfaces on the bottom edge under a browser toolbar.
 *
 * Chrome on iOS can place `position: fixed` against a layout viewport that runs
 * under its bottom toolbar, until the first scroll. `useCoveredBottom` reads the
 * strip off the visual viewport, and each surface pads its content clear of it.
 * The visual viewport of the test browser has no toolbar, so a stub stands in
 * for it. Each padding is an arbitrary Tailwind value, and only a real browser
 * shows that it applies. The page is 414 px wide, so each surface takes its
 * phone layout.
 */

/** The toolbar the stub puts over the bottom of the screen, in pixels. */
const TOOLBAR = 60

/** Stubs a visual viewport that stops {@link TOOLBAR} short of the layout viewport. */
function stubToolbar() {
	vi.stubGlobal(
		'visualViewport',
		Object.assign(new EventTarget(), {
			offsetTop: 0,
			height: window.innerHeight - TOOLBAR,
			scale: 1,
		}),
	)
}

/** The computed bottom padding of a node, in pixels. */
function paddingBottom(node: Element): number {
	return Number.parseFloat(getComputedStyle(node).paddingBottom)
}

/** Renders an open `auto` drawer with a heading and a short body. */
function renderDrawer() {
	renderUI(
		<Drawer open handle animateOnMount={false} onOpenChange={() => {}} aria-label="Options">
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

describe('surfaces on the bottom edge under a browser toolbar (real browser)', () => {
	it('keeps the rows of a drawer above the toolbar', async () => {
		stubToolbar()

		const { panel, rows } = renderDrawer()

		await frames()

		// The panel still reaches the bottom of the layout viewport, under the toolbar.
		expect(panel.getBoundingClientRect().bottom).toBeNear(window.innerHeight, HALF_PIXEL)

		expect(paddingBottom(panel)).toBeNear(TOOLBAR, HALF_PIXEL)

		expect(rows.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			window.innerHeight - TOOLBAR + HALF_PIXEL,
		)
	})

	it('adds no padding to a drawer when nothing covers the bottom edge', async () => {
		const { panel } = renderDrawer()

		await frames()

		expect(paddingBottom(panel)).toBe(0)
	})

	it('keeps the inset of a phone dialog above the toolbar', async () => {
		stubToolbar()

		renderUI(
			<Dialog open onOpenChange={() => {}} aria-label="Confirm">
				Body
			</Dialog>,
		)

		await frames()

		// The inset of 1.5rem stands on top of the toolbar.
		expect(paddingBottom(getSlot(document.body, 'dialog'))).toBeNear(24 + TOOLBAR, HALF_PIXEL)
	})

	it('pads a bottom sheet by the toolbar', async () => {
		stubToolbar()

		renderUI(
			<Sheet open side="bottom" onOpenChange={() => {}} aria-label="Filters">
				Body
			</Sheet>,
		)

		await frames()

		expect(paddingBottom(getSlot(document.body, 'sheet'))).toBeNear(TOOLBAR, HALF_PIXEL)
	})

	it('keeps the toast stack 1rem above the toolbar', async () => {
		stubToolbar()

		renderUI(
			<ToastProvider>
				<Toast />
			</ToastProvider>,
		)

		await frames()

		expect(paddingBottom(getSlot(document.body, 'toast-viewport'))).toBeNear(
			16 + TOOLBAR,
			HALF_PIXEL,
		)
	})
})
