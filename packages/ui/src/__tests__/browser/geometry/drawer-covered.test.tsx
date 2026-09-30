import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from '../../../components/drawer'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * Real-browser check of the drawer under browser chrome.
 *
 * Chrome on iOS can place `position: fixed` against a layout viewport that runs
 * under its bottom toolbar, until the first scroll. The drawer reads the strip
 * off the visual viewport, and pads its content clear of it. The visual
 * viewport of the test browser has no toolbar, so a stub stands in for it. The
 * padding is an arbitrary Tailwind value, and only a real browser shows that it
 * applies.
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

describe('drawer under browser chrome (real browser)', () => {
	it('keeps the rows above a toolbar over the bottom edge', async () => {
		stubToolbar()

		const { panel, rows } = renderDrawer()

		await frames()

		// The panel still reaches the bottom of the layout viewport, under the toolbar.
		expect(panel.getBoundingClientRect().bottom).toBeNear(window.innerHeight, HALF_PIXEL)

		expect(getComputedStyle(panel).paddingBottom).toBe(`${TOOLBAR}px`)

		expect(rows.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			window.innerHeight - TOOLBAR + HALF_PIXEL,
		)
	})

	it('adds no padding when nothing covers the bottom edge', async () => {
		const { panel } = renderDrawer()

		await frames()

		expect(getComputedStyle(panel).paddingBottom).toBe('0px')
	})
})
