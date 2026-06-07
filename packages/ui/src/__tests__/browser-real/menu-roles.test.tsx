import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../components/menu'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Menu ARIA roles (real floating engine). floating-ui's `useRole` stamped
 * `role="menu"` on the positioning wrapper while `PopoverPanel` renders the
 * real `role="menu"`, nesting two menus, and the trigger's `aria-controls`
 * (supplied only by `useRole`) pointed at that wrapper rather than the
 * menuitem container (ARIA-AUDIT pattern A). jsdom mocks `useRole` away, so
 * this guards the single-menu tree against the live engine: `role: null` on
 * `useFloatingDisclosure` plus a hand-rolled `aria-controls` → the panel id.
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

		// The trigger's aria-controls resolves to that single menu panel — not the
		// positioning wrapper.
		expect(trigger).toHaveAttribute('aria-expanded', 'true')
		expect(trigger.getAttribute('aria-controls')).toBe(menu.id)
		expect(menu.id).toBeTruthy()
	})
})
