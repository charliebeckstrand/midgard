import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../components/menu'
import { renderUI, screen, userEvent, waitFor } from '../helpers'
import { focus } from './cases'

/**
 * Focus-management gate. The axe baseline gate is explicitly blind to focus
 * behaviour (order, traps, restoration); this covers the half of it that jsdom
 * can actually observe: that opening a dismissable overlay pulls keyboard focus
 * off the trigger and into the surface, so a keyboard or screen-reader user
 * lands inside the overlay rather than stranded behind it (WCAG 2.4.3). Each
 * case (`cases/focus.tsx`) drives the real open interaction and returns the
 * trigger focus left.
 */
describe('a11y focus — overlays capture focus on open', () => {
	it.each(
		focus,
	)('%s moves focus off the trigger into the surface', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		const trigger = await open(user)

		// Focus has left the trigger…
		expect(trigger).not.toHaveFocus()
		// …and landed on a real element inside the surface, not nowhere.
		expect(document.activeElement).not.toBe(document.body)
		expect(document.activeElement).not.toBeNull()
	})
})

/**
 * Focus restoration on close is mostly real-browser-only here: the modal Overlay
 * family (dialog/drawer/sheet/confirm/command palette) returns focus through
 * floating-ui's previously-focused-element path, which jsdom resolves to <body>
 * rather than the trigger — so it belongs in a real-browser layer alongside the
 * disabled color-contrast and target-size rules. The dropdown family restores
 * via a direct `.focus()` on the trigger ref (`useFloatingUI`'s `restoreFocusTo`),
 * which jsdom does honour, so Menu stands in for that path as a regression guard.
 */
describe('a11y focus — restoration (dropdown family)', () => {
	it('menu returns focus to its trigger on Escape', async () => {
		const user = userEvent.setup()

		renderUI(
			<Menu>
				<MenuTrigger>
					<Button variant="outline">Options</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuSection>
						<MenuItem>
							<MenuLabel>Edit</MenuLabel>
						</MenuItem>
					</MenuSection>
				</MenuContent>
			</Menu>,
		)

		await user.click(screen.getByRole('button', { name: 'Options' }))
		await screen.findByRole('menu')

		await user.keyboard('{Escape}')

		// Re-query: the trigger node is recreated across the open/close cycle, so a
		// reference captured before opening would be stale.
		await waitFor(() => expect(screen.getByRole('button', { name: 'Options' })).toHaveFocus())
	})
})
