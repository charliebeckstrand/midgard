import { describe, expect, it, vi } from 'vitest'
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

/**
 * A dropdown keeps focus on its trigger, so its items rove by
 * `aria-activedescendant`: arrow keys move a `data-active` cursor over the items
 * and point the trigger at the active row, and Enter activates it — all without
 * moving focus off the trigger.
 */
describe('MenuTrigger arrow-key roving (real floating engine)', () => {
	function menu(onEdit = () => {}, onDuplicate = () => {}) {
		return (
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem onAction={onEdit}>Edit</MenuItem>
					<MenuItem onAction={onDuplicate}>Duplicate</MenuItem>
				</MenuContent>
			</Menu>
		)
	}

	it('ArrowDown roves the active item while focus stays on the trigger', async () => {
		renderUI(menu())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()
		await userEvent.click(trigger)
		await screen.findByRole('menu')

		const edit = screen.getByRole('menuitem', { name: 'Edit' })
		const duplicate = screen.getByRole('menuitem', { name: 'Duplicate' })

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(edit).toHaveAttribute('data-active'))
		// Focus never leaves the trigger; the active row is tracked by ARIA, not focus.
		expect(trigger).toHaveFocus()
		expect(trigger).toHaveAttribute('aria-activedescendant', edit.id)

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(duplicate).toHaveAttribute('data-active'))
		expect(edit).not.toHaveAttribute('data-active')
		expect(trigger).toHaveFocus()
		expect(trigger).toHaveAttribute('aria-activedescendant', duplicate.id)
	})

	it('Enter activates the active item and closes the menu', async () => {
		const onEdit = vi.fn()
		renderUI(menu(onEdit))
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()
		await userEvent.click(trigger)
		await screen.findByRole('menu')

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() =>
			expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('data-active'),
		)

		await userEvent.keyboard('{Enter}')

		await waitFor(() => {
			expect(onEdit).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})
	})

	it('clears aria-activedescendant when the menu closes', async () => {
		renderUI(menu())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()
		await userEvent.click(trigger)
		await screen.findByRole('menu')

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() => expect(trigger).toHaveAttribute('aria-activedescendant'))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger).not.toHaveAttribute('aria-activedescendant')
		})
	})
})
