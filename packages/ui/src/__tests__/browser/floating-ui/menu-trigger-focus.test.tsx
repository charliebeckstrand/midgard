import { type ReactElement, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { frames, renderUI, screen, stubMatchMedia, waitFor } from '../../helpers'

/**
 * Renders `element`, focuses its trigger, and opens the menu with a click.
 *
 * @returns The trigger.
 */
async function openMenu(element: ReactElement): Promise<HTMLElement> {
	renderUI(element)
	const trigger = screen.getByRole('button', { name: 'Open' })
	trigger.focus()

	await userEvent.click(trigger)
	await screen.findByRole('menu')

	return trigger
}

/**
 * Opening a dropdown menu keeps keyboard focus on the trigger: it is never
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

	it.each([
		['click', (trigger: HTMLElement) => userEvent.click(trigger)],
		['Enter', () => userEvent.keyboard('{Enter}')],
	])('keeps focus on the trigger on open (%s), never dropping to body', async (_, open) => {
		renderUI(tree())
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()

		await open(trigger)
		await screen.findByRole('menu')

		await waitFor(() => {
			expect(document.activeElement).not.toBe(document.body)
			expect(trigger).toHaveFocus()
		})
	})

	it('closes the menu and moves focus onward when Tab is pressed', async () => {
		const trigger = await openMenu(tree())
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
 * and point the trigger at the active row, and Enter activates it, all without
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
		const trigger = await openMenu(menu())

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
		await openMenu(menu(onEdit))

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

	it('Space activates the active item and stays closed (does not re-toggle)', async () => {
		const onEdit = vi.fn()
		await openMenu(menu(onEdit))

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() =>
			expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('data-active'),
		)

		// Space selects the active row like Enter; the trigger's native Space
		// activation must not fire and re-open the just-closed menu.
		await userEvent.keyboard('[Space]')

		await waitFor(() => {
			expect(onEdit).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})

		// Settle a frame in case a stray keyup click would re-toggle it.
		await frames()
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		expect(onEdit).toHaveBeenCalledTimes(1)
	})

	it('clears aria-activedescendant when the menu closes', async () => {
		const trigger = await openMenu(menu())

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() => expect(trigger).toHaveAttribute('aria-activedescendant'))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger).not.toHaveAttribute('aria-activedescendant')
		})
	})
})

/**
 * A key opens a dropdown on its first row, as the menu button pattern of the
 * APG tells: Enter, Space, and ArrowDown. A disabled row is not a stop. A press
 * of the pointer opens the menu with no active row. The jsdom mock records no
 * open event, so only this suite shows the cursor.
 */
describe('MenuTrigger key open (real floating engine)', () => {
	function rows(onEdit = () => {}) {
		return (
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem disabled>Archive</MenuItem>
					<MenuItem onAction={onEdit}>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>
		)
	}

	/** Renders {@link rows}, and focuses the trigger. @returns The trigger. */
	function renderRows(onEdit?: () => void): HTMLElement {
		renderUI(rows(onEdit))

		const trigger = screen.getByRole('button', { name: 'Open' })

		trigger.focus()

		return trigger
	}

	it.each(['{Enter}', '[Space]', '{ArrowDown}'])(
		'opens on the first row on %s, with focus on the trigger',
		async (key) => {
			const trigger = renderRows()

			await userEvent.keyboard(key)

			const edit = await screen.findByRole('menuitem', { name: 'Edit' })

			await waitFor(() => expect(trigger).toHaveAttribute('aria-activedescendant', edit.id))

			expect(edit).toHaveAttribute('data-active')

			expect(trigger).toHaveFocus()
		},
	)

	it('runs the first row on a second Enter', async () => {
		const onEdit = vi.fn()

		renderRows(onEdit)

		await userEvent.keyboard('{Enter}')

		await waitFor(() =>
			expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('data-active'),
		)

		await userEvent.keyboard('{Enter}')

		await waitFor(() => {
			expect(onEdit).toHaveBeenCalledTimes(1)

			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})
	})

	it('moves to the next row on an ArrowDown after a key open', async () => {
		const trigger = renderRows()

		await userEvent.keyboard('{Enter}')

		await waitFor(() =>
			expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('data-active'),
		)

		await userEvent.keyboard('{ArrowDown}')

		const duplicate = screen.getByRole('menuitem', { name: 'Duplicate' })

		await waitFor(() => expect(trigger).toHaveAttribute('aria-activedescendant', duplicate.id))
	})

	it('opens with no active row on a click', async () => {
		const trigger = renderRows()

		await userEvent.click(trigger)

		await screen.findByRole('menu')

		await frames()

		expect(trigger).not.toHaveAttribute('aria-activedescendant')

		for (const row of screen.getAllByRole('menuitem'))
			expect(row).not.toHaveAttribute('data-active')
	})

	// A row closes the menu with no event, so the record of the key open must
	// not outlive the close. Else an open by the `open` prop reads it as a key.
	it('opens with no active row from the open prop after a key open', async () => {
		function Controlled() {
			const [open, setOpen] = useState(false)

			return (
				<>
					<Menu placement="bottom-start" open={open} onOpenChange={setOpen}>
						<MenuTrigger>
							<Button>Open</Button>
						</MenuTrigger>
						<MenuContent>
							<MenuItem>Edit</MenuItem>
						</MenuContent>
					</Menu>
					<button type="button" onClick={() => setOpen(true)}>
						Show
					</button>
				</>
			)
		}

		renderUI(<Controlled />)

		const trigger = screen.getByRole('button', { name: 'Open' })

		trigger.focus()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(trigger).toHaveAttribute('aria-activedescendant'))

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

		await userEvent.click(screen.getByRole('button', { name: 'Show' }))

		await screen.findByRole('menu')

		await frames()

		expect(trigger).not.toHaveAttribute('aria-activedescendant')
	})
})

/**
 * On a phone the dropdown opens as a sheet, and the rows rove by real focus. A
 * key opens the sheet with the focus on the first row. A tap opens it with the
 * focus on the panel, so no row shows focus.
 */
describe('MenuSheet key open (real browser)', () => {
	// A phone: no hover and a narrow viewport.
	beforeEach(() => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))
	})

	function renderSheet(): HTMLElement {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem disabled>Archive</MenuItem>
					<MenuItem>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		trigger.focus()

		return trigger
	}

	it.each(['{Enter}', '[Space]', '{ArrowDown}'])('focuses the first row on %s', async (key) => {
		renderSheet()

		await userEvent.keyboard(key)

		await screen.findByRole('dialog', { name: 'Open' })

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())
	})

	it('focuses the panel on a tap', async () => {
		const trigger = renderSheet()

		await userEvent.click(trigger)

		await screen.findByRole('dialog', { name: 'Open' })

		await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus())
	})
})
