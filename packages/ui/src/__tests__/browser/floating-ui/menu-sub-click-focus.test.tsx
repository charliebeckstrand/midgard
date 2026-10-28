import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { fireEvent, frames, renderUI, screen, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/**
 * A click on the parent row of a submenu opens the submenu and leaves the cursor
 * on that row, through the press and after it. The click never moves focus into
 * the submenu. Only a key does (WAI-ARIA APG), also in a dropdown.
 *
 * Safari and Firefox on macOS do not focus a button on a press. Focus falls to
 * the nearest focusable ancestor, here the panel of the menu, and the blur of the
 * row closed the submenu before the click opened it again. The `safari` case
 * copies that: a press that no handler cancels moves focus to the ancestor.
 *
 * Rides the real browser because the jsdom suite renders each panel inline and
 * sends no real press.
 */
describe('a click on a submenu row (real browser)', () => {
	const row = () => screen.getByRole('menuitem', { name: /More/ })

	const nested = () => screen.queryByRole('menuitem', { name: 'Nested' })

	// Runs after the handlers of React, which listen on the root, so it sees
	// whether one of them canceled the press.
	function pressLikeSafari(event: MouseEvent) {
		const button = (event.target as HTMLElement).closest('button')

		if (!button || event.defaultPrevented) return

		event.preventDefault()

		button.parentElement?.closest<HTMLElement>('[tabindex]')?.focus()
	}

	afterEach(() => {
		document.removeEventListener('mousedown', pressLikeSafari)
	})

	async function openContextMenu() {
		renderUI(
			<Menu>
				<div data-testid="surface" style={{ width: 300, height: 200 }}>
					Surface
				</div>
				<MenuContent aria-label="Actions">
					<MenuItem>Edit</MenuItem>
					<MenuSub label="More">
						<MenuItem>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		const surface = screen.getByTestId('surface')

		const at = getCenter(surface)

		fireEvent.contextMenu(surface, { clientX: at.x, clientY: at.y })

		await waitFor(() => expect(row()).toBeVisible())

		await frames()
	}

	it.each([
		['chromium', false],
		['safari', true],
	])('keeps focus on the row through each click (%s)', async (_, safari) => {
		if (safari) document.addEventListener('mousedown', pressLikeSafari)

		await openContextMenu()

		// Hover opens the submenu and puts the cursor on the row.
		await userEvent.hover(row())

		await waitFor(() => expect(nested()).toBeVisible())

		expect(row()).toHaveFocus()

		let focusDuringPress: Element | null = null

		const onPress = () => {
			focusDuringPress = document.activeElement
		}

		// After the default action of the press, which is where focus moves.
		row().addEventListener('mouseup', onPress)

		await userEvent.click(row())

		await frames()

		expect(focusDuringPress).toBe(row())

		expect(row()).toHaveFocus()

		expect(row()).toHaveAttribute('aria-expanded', 'true')

		// A second click changes nothing: a click only opens.
		await userEvent.click(row())

		await frames()

		expect(row()).toHaveFocus()

		expect(row()).toHaveAttribute('aria-expanded', 'true')
	})

	it('moves focus to the first row of the submenu on Enter', async () => {
		await openContextMenu()

		await userEvent.hover(row())

		await waitFor(() => expect(row()).toHaveFocus())

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(nested()).toHaveFocus())
	})

	it('keeps focus on the dropdown trigger, with the row active, on a click', async () => {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
					<MenuSub label="More">
						<MenuItem>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		await waitFor(() => expect(row()).toBeVisible())

		await userEvent.click(row())

		await waitFor(() => expect(nested()).toBeVisible())

		expect(trigger).toHaveFocus()

		expect(row()).toHaveAttribute('data-active')
	})

	// The key arrives on the trigger, which keeps focus and roves by
	// `aria-activedescendant`. It opens the submenu of the active row.
	it('opens the submenu of the active row of a dropdown on ArrowRight', async () => {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
					<MenuSub label="More">
						<MenuItem>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		trigger.focus()

		await userEvent.click(trigger)

		await waitFor(() => expect(row()).toBeVisible())

		await userEvent.keyboard('{ArrowDown}{ArrowDown}')

		await waitFor(() => expect(row()).toHaveAttribute('data-active'))

		await userEvent.keyboard('{ArrowRight}')

		await waitFor(() => expect(nested()).toHaveFocus())

		await userEvent.keyboard('{ArrowLeft}')

		await waitFor(() => expect(row()).toHaveAttribute('aria-expanded', 'false'))

		expect(trigger).toHaveFocus()
	})
})
