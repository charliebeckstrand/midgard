import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { Toolbar } from '../../../components/toolbar'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Opening a dropdown menu from a focused trigger must carry keyboard focus into
 * the panel and seat it on the first menu item — a real `role="menuitem"`
 * control — not leave it on the bare `tabIndex={-1}` container, which a browser
 * can drop to `<body>` mid-open (WCAG 2.4.3). Real Tab/focus movement needs the
 * live floating engine, so this runs in the browser suite.
 */
describe('MenuTrigger focus on open (real floating engine)', () => {
	const menu = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button>Open</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>Edit</MenuItem>
				<MenuItem>Duplicate</MenuItem>
			</MenuContent>
		</Menu>
	)

	async function expectFirstItemFocused() {
		await screen.findByRole('menu')

		await waitFor(() => {
			expect(document.activeElement).not.toBe(document.body)
			expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }))
		})
	}

	it('click seats focus on the first menu item, not the body', async () => {
		renderUI(menu)
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.click(trigger)
		await expectFirstItemFocused()
	})

	it('Enter seats focus on the first menu item, not the body', async () => {
		renderUI(menu)
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.keyboard('{Enter}')
		await expectFirstItemFocused()
	})

	it('a trigger inside a roving Toolbar still lands focus on the first item', async () => {
		renderUI(
			<Toolbar aria-label="Tools">
				{menu}
				<Button>Other</Button>
			</Toolbar>,
		)
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.click(trigger)
		await expectFirstItemFocused()
	})
})
