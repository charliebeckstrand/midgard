import { describe, expect, vi } from 'vitest'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { fireEvent, renderUI, screen } from '../helpers'
import { it, onFakeClock } from '../helpers/fake-clock'

/**
 * A context menu opens on a touch long press.
 *
 * iOS Safari fires no `contextmenu` event on a long press, so a menu that opened only on
 * `contextmenu` could not open on an iPhone. The Menu surface now times a touch hold, and
 * dispatches `contextmenu` itself when the hold reaches the delay.
 */
describe('a context Menu under a touch long press', () => {
	onFakeClock()

	function renderSurface(onClick = vi.fn(), onEdit = vi.fn()) {
		renderUI(
			<Menu>
				<button type="button" data-testid="surface" onClick={onClick}>
					Hold me
				</button>
				<MenuContent>
					<MenuItem onClick={onEdit}>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		return screen.getByTestId('surface')
	}

	const touch = { pointerType: 'touch', isPrimary: true, clientX: 40, clientY: 60 }

	it('opens the menu when a touch holds for the delay', async ({ clock }) => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY - 1)

		expect(screen.queryByRole('menu')).toBeNull()

		await clock.advance(1)

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('drops the click that ends the hold', async ({ clock }) => {
		const onClick = vi.fn()

		const surface = renderSurface(onClick)

		fireEvent.pointerDown(surface, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		fireEvent.pointerUp(surface, touch)

		fireEvent.click(surface)

		expect(onClick).not.toHaveBeenCalled()
	})

	it('keeps a quick tap on an item of the opened menu', async ({ clock }) => {
		const onEdit = vi.fn()

		const surface = renderSurface(vi.fn(), onEdit)

		fireEvent.pointerDown(surface, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		// iOS can end a long press with no click. The next tap is a new press.
		fireEvent.pointerUp(surface, touch)

		const item = screen.getByRole('menuitem', { name: 'Edit' })

		fireEvent.pointerDown(item, touch)

		fireEvent.pointerUp(item, touch)

		fireEvent.click(item)

		expect(onEdit).toHaveBeenCalledTimes(1)
	})

	it('does not open when the touch lifts before the delay', async ({ clock }) => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		fireEvent.pointerUp(surface, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('does not open when the touch moves into a scroll', async ({ clock }) => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		fireEvent.pointerMove(surface, { ...touch, clientY: 90 })

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('leaves a hold in a readout surface to that readout', async ({ clock }) => {
		renderUI(
			<Menu>
				<div data-touch-readout="">
					<span data-testid="mark">Q3</span>
				</div>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.pointerDown(screen.getByTestId('mark'), touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('leaves a mouse press to the right-click', async ({ clock }) => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, { ...touch, pointerType: 'mouse' })

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		expect(screen.queryByRole('menu')).toBeNull()
	})
})
