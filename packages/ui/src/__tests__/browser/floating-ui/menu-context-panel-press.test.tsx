import { describe, expect, it, vi } from 'vitest'
import { Menu, MenuContent, MenuItem, MenuSub } from '../../../components/menu'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../../components/menu/use-menu-touch-hold'
import { fireEvent, frames, renderUI, screen, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'
import { pause } from '../helpers/wall-clock'

/**
 * A press inside an open panel of a context menu belongs to that menu.
 *
 * Each panel is portaled out of the surface but stays a React child of it, so its
 * events bubble to the surface. A right-click on a submenu row anchored the menu
 * on an element in its own submenu. A slow tap on a row ran the surface's touch
 * hold, which opened nothing and dropped the click that ended the press. Each
 * panel of the menu is a case here.
 *
 * Rides the real browser because the jsdom suite renders each panel inline, in
 * the surface.
 */
describe('a press inside an open context menu (real browser)', () => {
	const touch = { pointerType: 'touch', isPrimary: true, pointerId: 7 }

	async function openMenu(onAction: (name: string) => void) {
		renderUI(
			<Menu>
				<div data-testid="surface" style={{ width: 300, height: 200 }}>
					Surface
				</div>
				<MenuContent aria-label="Actions">
					<MenuItem onAction={() => onAction('Edit')}>Edit</MenuItem>
					<MenuSub label="More">
						<MenuItem onAction={() => onAction('Nested')}>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		const surface = screen.getByTestId('surface')

		const at = getCenter(surface)

		fireEvent.contextMenu(surface, { clientX: at.x, clientY: at.y })

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeVisible())

		fireEvent.click(screen.getByRole('menuitem', { name: /More/ }))

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Nested' })).toBeVisible())
	}

	const rootPanel = () => screen.getByRole('menu', { name: 'Actions' })

	it.each(['Edit', 'Nested'])('leaves the menu in place on a right-click on %s', async (name) => {
		await openMenu(() => {})

		const before = rootPanel().getBoundingClientRect()

		const row = screen.getByRole('menuitem', { name })

		const at = getCenter(row)

		fireEvent.contextMenu(row, { clientX: at.x + 40, clientY: at.y + 40 })

		await frames()

		const after = rootPanel().getBoundingClientRect()

		expect([after.left, after.top]).toEqual([before.left, before.top])
	})

	it.each(['Edit', 'Nested'])('activates %s on a slow touch tap', async (name) => {
		const onAction = vi.fn()

		await openMenu(onAction)

		const row = screen.getByRole('menuitem', { name })

		const at = getCenter(row)

		fireEvent.pointerDown(row, { ...touch, clientX: at.x, clientY: at.y })

		await pause(TOUCH_CONTEXT_MENU_DELAY + 100)

		fireEvent.pointerUp(row, { ...touch, clientX: at.x, clientY: at.y })

		fireEvent.click(row)

		expect(onAction).toHaveBeenCalledExactlyOnceWith(name)
	})
})
