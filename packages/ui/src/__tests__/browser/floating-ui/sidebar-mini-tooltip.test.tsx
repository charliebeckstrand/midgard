import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Sidebar, SidebarItem, SidebarLabel } from '../../../components/sidebar'
import { renderUI, screen } from '../../helpers'

/**
 * The label tooltip of the mini rail against the real floating engine. The
 * jsdom suite mocks `@floating-ui/react`, and its mock merges the props of the
 * trigger in a different order. Thus only this suite shows which description
 * the item button gets.
 *
 * The tooltip echoes the label, and the label is the accessible name of the
 * item. A description that points at the tooltip makes a screen reader say the
 * label two times.
 */
describe('Sidebar mini tooltip (real browser)', () => {
	beforeAll(() => page.viewport(1280, 800))

	it('does not describe a rail item by the label that names it', async () => {
		renderUI(
			<Sidebar mini>
				<SidebarItem>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		const home = screen.getByRole('button', { name: 'Home' })

		await userEvent.hover(home)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('Home')

		expect(home).not.toHaveAttribute('aria-describedby')
	})

	it('keeps a description that the consumer gives', async () => {
		renderUI(
			<Sidebar mini>
				<SidebarItem aria-describedby="hint">
					<SidebarLabel>Inbox</SidebarLabel>
				</SidebarItem>
				<p id="hint">3 unread</p>
			</Sidebar>,
		)

		const inbox = screen.getByRole('button', { name: 'Inbox' })

		await userEvent.hover(inbox)

		await screen.findByRole('tooltip')

		expect(inbox).toHaveAccessibleDescription('3 unread')
	})
})
