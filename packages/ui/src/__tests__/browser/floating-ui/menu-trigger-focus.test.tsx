import { type ReactElement, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { NO_HOVER_QUERY, PHONE_QUERY } from '../../../utilities/media-query'
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
 * Opening a dropdown menu moves real focus into the `menu`, as the menu button
 * pattern of the APG tells. A screen reader then switches to focus mode, and
 * the arrow keys reach the rows (WCAG 4.1.2, 2.1.1). The focus never drops to
 * `<body>` on the way into the portaled, animating panel (WCAG 2.4.3). Tab in
 * the menu closes it and carries focus to the tabbable after the trigger in one
 * keystroke. Real focus movement needs the live floating engine, so this runs
 * in the browser suite.
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
		['click', (trigger: HTMLElement) => userEvent.click(trigger), 'menu'],
		['Enter', () => userEvent.keyboard('{Enter}'), 'menuitem'],
	] as const)(
		'moves focus into the menu on open (%s), never dropping to body',
		async (_, open, role) => {
			renderUI(tree())
			const trigger = screen.getByRole('button', { name: 'Open' })
			trigger.focus()

			await open(trigger)
			await screen.findByRole('menu')

			await waitFor(() => {
				expect(document.activeElement).not.toBe(document.body)
				expect(document.activeElement?.getAttribute('role')).toBe(role)
			})

			// No trigger state points into the panel: the focus itself is the cursor.
			expect(trigger).not.toHaveAttribute('aria-activedescendant')
		},
	)

	it.each([
		['{Tab}', 'after'],
		['{Shift>}{Tab}{/Shift}', 'before'],
	])('closes the menu and moves focus onward on %s', async (key, target) => {
		await openMenu(
			<>
				<button type="button">before</button>
				{tree()}
			</>,
		)

		await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus())

		await userEvent.keyboard(key)

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			// Focus goes on from the trigger, not back onto it and not to the body.
			expect(screen.getByRole('button', { name: target })).toHaveFocus()
		})
	})

	it('returns focus to the trigger on Escape', async () => {
		const trigger = await openMenu(tree())

		await userEvent.keyboard('{ArrowDown}')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})
})

/**
 * The rows of a dropdown rove by real focus: the arrow keys move the focus
 * over the rows, and Enter or Space runs the focused row.
 */
describe('MenuContent arrow-key roving (real floating engine)', () => {
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

	it('ArrowDown moves the focus over the rows', async () => {
		await openMenu(menu())

		const edit = screen.getByRole('menuitem', { name: 'Edit' })
		const duplicate = screen.getByRole('menuitem', { name: 'Duplicate' })

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(edit).toHaveFocus())

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(duplicate).toHaveFocus())
	})

	it('Enter runs the focused row, closes the menu, and returns focus to the trigger', async () => {
		const onEdit = vi.fn()
		const trigger = await openMenu(menu(onEdit))

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		await userEvent.keyboard('{Enter}')

		await waitFor(() => {
			expect(onEdit).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})

	it('Space runs the focused row and stays closed (does not re-toggle)', async () => {
		const onEdit = vi.fn()
		await openMenu(menu(onEdit))

		await userEvent.keyboard('{ArrowDown}')
		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		// Space runs the row like Enter. The focus goes back to the trigger, and the
		// release of the key must not click the trigger and open the menu again.
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
})

/**
 * A key opens a dropdown with the focus on its first row, as the menu button
 * pattern of the APG tells: Enter, Space, and ArrowDown. A disabled row is not
 * a stop. A press of the pointer opens the menu with the focus on the panel and
 * no focused row. The jsdom mock records no open event, so only this suite
 * shows the first focus.
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
		'opens with the focus on the first row on %s',
		async (key) => {
			renderRows()

			await userEvent.keyboard(key)

			const edit = await screen.findByRole('menuitem', { name: 'Edit' })

			await waitFor(() => expect(edit).toHaveFocus())
		},
	)

	it('runs the first row on a second Enter', async () => {
		const onEdit = vi.fn()

		renderRows(onEdit)

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		await userEvent.keyboard('{Enter}')

		await waitFor(() => {
			expect(onEdit).toHaveBeenCalledTimes(1)

			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})
	})

	it('moves to the next row on an ArrowDown after a key open', async () => {
		renderRows()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus())
	})

	it('opens with the focus on the panel on a click', async () => {
		const trigger = renderRows()

		await userEvent.click(trigger)

		const menu = await screen.findByRole('menu')

		await frames()

		expect(menu).toHaveFocus()
	})

	// TalkBack on Android sends a double tap as a click with a pointer type and
	// the primary button down. Floating UI calls that click virtual, as a click
	// from a key, so the menu opens on its first row.
	it('opens on the first row from a TalkBack double tap', async () => {
		// Chromium has `userAgentData`, and Floating UI reads its platform first.
		vi.spyOn(
			navigator as Navigator & { userAgentData: unknown },
			'userAgentData',
			'get',
		).mockReturnValue({
			platform: 'Android',
		})

		const trigger = renderRows()

		trigger.dispatchEvent(
			new PointerEvent('click', { bubbles: true, detail: 1, pointerType: 'touch', buttons: 1 }),
		)

		const edit = await screen.findByRole('menuitem', { name: 'Edit' })

		await waitFor(() => expect(edit).toHaveFocus())
	})

	// A click with no pointer but a pointer type is not a key. Floating UI does
	// not call it virtual, so the menu opens with the focus on the panel.
	it('opens with the focus on the panel on a click that has a pointer type', async () => {
		const trigger = renderRows()

		trigger.dispatchEvent(
			new PointerEvent('click', { bubbles: true, detail: 0, pointerType: 'mouse' }),
		)

		const menu = await screen.findByRole('menu')

		await frames()

		expect(menu).toHaveFocus()
	})

	// A row closes the menu with no event, so the record of the key open must
	// not outlive the close. Else an open by the `open` prop reads it as a key.
	it('opens with the focus on the panel from the open prop after a key open', async () => {
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

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

		await userEvent.click(screen.getByRole('button', { name: 'Show' }))

		const menu = await screen.findByRole('menu')

		await frames()

		expect(menu).toHaveFocus()
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
		stubMatchMedia((query) => query === NO_HOVER_QUERY || query === PHONE_QUERY)
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
