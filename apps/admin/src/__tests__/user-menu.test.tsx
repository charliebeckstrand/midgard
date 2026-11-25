import { act, fireEvent, render, screen } from '@testing-library/react'
import { Button } from 'ui/button'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserMenu } from '../../app/(signed-in)/user-menu'

// The menu loads its panel in idle time (`useIntentLoad`). This import loads
// that module before the cases run. Thus a case waits for the menu to open, not
// for the first transform of the module (CONVENTIONS.md §10.14).
import '../../app/(signed-in)/user-menu-panel'

beforeEach(() => {
	// jsdom has no `ResizeObserver`, and the open menu watches its parts with one.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

/** The user menu, with a button trigger as in the header of a user that is not an admin. */
function renderMenu() {
	return render(
		<UserMenu
			placement="bottom-end"
			trigger={(props) => (
				<Button {...props} aria-label="User menu">
					U
				</Button>
			)}
		/>,
	)
}

describe('UserMenu', () => {
	it('is a closed menu button before the first press', () => {
		renderMenu()

		const trigger = screen.getByRole('button', { name: 'User menu' })

		expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
		expect(trigger.getAttribute('aria-expanded')).toBe('false')
		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('opens the menu on the first press, with the account link and sign-out', async () => {
		renderMenu()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
		})

		const menu = await screen.findByRole('menu')

		expect(menu.textContent).toContain('Account')
		expect(menu.textContent).toContain('Sign out')
		expect(menu.querySelector('a')?.getAttribute('href')).toBe('/account')
		expect(screen.getByRole('button', { name: 'User menu' }).getAttribute('aria-expanded')).toBe(
			'true',
		)
	})

	it('gives the focus back to the trigger of the open menu when it closes', async () => {
		renderMenu()

		const first = screen.getByRole('button', { name: 'User menu' })

		act(() => {
			first.focus()
			fireEvent.click(first)
		})

		const menu = await screen.findByRole('menu')

		await vi.waitFor(() => expect(menu.contains(document.activeElement)).toBe(true))

		act(() => {
			fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
		})

		await vi.waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

		// The open menu has its own trigger in place of the first one.
		const trigger = screen.getByRole('button', { name: 'User menu' })

		expect(trigger).not.toBe(first)
		expect(document.activeElement).toBe(trigger)
	})
})
