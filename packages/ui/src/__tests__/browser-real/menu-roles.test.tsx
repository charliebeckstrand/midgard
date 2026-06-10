import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../components/menu'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Menu ARIA roles (real floating engine). Verifies `role: null` on
 * `useFloatingDisclosure` plus a hand-rolled `aria-controls` → panel id keep
 * floating-ui's `useRole` from stamping `role="menu"` on the positioning
 * wrapper alongside `PopoverPanel`'s real `role="menu"`, which would nest two
 * menus and point the trigger's `aria-controls` at the wrapper rather than
 * the menuitem container. jsdom mocks `useRole` away, so only the real engine
 * exercises this path.
 */
describe('Menu ARIA roles (real browser)', () => {
	it('exposes exactly one menu whose id the trigger controls', async () => {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1))

		const menu = screen.getByRole('menu')

		// The trigger's `aria-controls` resolves to that single menu panel, not the
		// positioning wrapper.
		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		expect(trigger.getAttribute('aria-controls')).toBe(menu.id)

		expect(menu.id).toBeTruthy()
	})
})
