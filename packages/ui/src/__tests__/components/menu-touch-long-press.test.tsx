import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A context menu opens on a touch long press.
 *
 * iOS Safari fires no `contextmenu` event on a long press, so a menu that opened only on
 * `contextmenu` could not open on an iPhone. The Menu surface now times a touch hold, and
 * dispatches `contextmenu` itself when the hold reaches the delay.
 */
describe('a context Menu under a touch long press', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	function renderSurface(onClick = vi.fn()) {
		renderUI(
			<Menu>
				<button type="button" data-testid="surface" onClick={onClick}>
					Hold me
				</button>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		return screen.getByTestId('surface')
	}

	const touch = { pointerType: 'touch', isPrimary: true, clientX: 40, clientY: 60 }

	it('opens the menu when a touch holds for the delay', () => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY - 1)
		})

		expect(screen.queryByRole('menu')).toBeNull()

		act(() => {
			vi.advanceTimersByTime(1)
		})

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('drops the click that ends the hold', () => {
		const onClick = vi.fn()

		const surface = renderSurface(onClick)

		fireEvent.pointerDown(surface, touch)

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY)
		})

		fireEvent.pointerUp(surface, touch)

		fireEvent.click(surface)

		expect(onClick).not.toHaveBeenCalled()
	})

	it('does not open when the touch lifts before the delay', () => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		fireEvent.pointerUp(surface, touch)

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY)
		})

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('does not open when the touch moves into a scroll', () => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, touch)

		fireEvent.pointerMove(surface, { ...touch, clientY: 90 })

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY)
		})

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('leaves a mouse press to the right-click', () => {
		const surface = renderSurface()

		fireEvent.pointerDown(surface, { ...touch, pointerType: 'mouse' })

		act(() => {
			vi.advanceTimersByTime(TOUCH_CONTEXT_MENU_DELAY)
		})

		expect(screen.queryByRole('menu')).toBeNull()
	})
})
