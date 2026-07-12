import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Opening a dropdown menu keeps keyboard focus on the trigger — it is never
 * pulled into the portaled, animating panel, which a real browser can drop to
 * `<body>` on open (WCAG 2.4.3). Tab off the trigger then closes the menu and
 * carries focus to the next tabbable in one keystroke. Real focus movement needs
 * the live floating engine, so this runs in the browser suite.
 */
describe('MenuTrigger focus on open (real floating engine)', () => {
	function tree() {
		return (
			<>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>
					<MenuContent>
						<MenuItem>Edit</MenuItem>
						<MenuItem>Duplicate</MenuItem>
					</MenuContent>
				</Menu>
				<button type="button">after</button>
			</>
		)
	}

	it('keeps focus on the trigger on open (click), never dropping to body', async () => {
		renderUI(tree())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.click(trigger)
		await screen.findByRole('menu')

		await waitFor(() => {
			expect(document.activeElement).not.toBe(document.body)
			expect(trigger).toHaveFocus()
		})
	})

	it('keeps focus on the trigger on open (Enter), never dropping to body', async () => {
		renderUI(tree())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.keyboard('{Enter}')
		await screen.findByRole('menu')

		await waitFor(() => {
			expect(document.activeElement).not.toBe(document.body)
			expect(trigger).toHaveFocus()
		})
	})

	it('closes the menu and moves focus onward when Tab is pressed', async () => {
		renderUI(tree())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await userEvent.click(trigger)
		await screen.findByRole('menu')
		expect(trigger).toHaveFocus()

		await userEvent.keyboard('{Tab}')

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			// Focus proceeds to the next tabbable after the trigger, not back onto it
			// and not to the body.
			expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
		})
	})
})
