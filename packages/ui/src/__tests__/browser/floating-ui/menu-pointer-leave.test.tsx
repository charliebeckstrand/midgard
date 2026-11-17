import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { fireEvent, frames, renderUI, screen, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/**
 * The pointer that leaves a menu panel takes the roving cursor with it, and the
 * next arrow key starts again at the first row. A row that stays lit under a
 * pointer that is not on the menu tells the reader that the next key acts on
 * that row.
 *
 * Rides the real browser because the jsdom suite gives a dropdown no floating
 * element to rove, renders each panel inline, and sends no real pointer move.
 */
describe('the pointer leaves a menu (real browser)', () => {
	const row = (name: string | RegExp) => screen.getByRole('menuitem', { name })

	/** A corner of the viewport that no panel covers. */
	const outside = (
		<div
			data-testid="outside"
			style={{ position: 'fixed', right: 0, bottom: 0, width: 40, height: 40 }}
		/>
	)

	const rows = (
		<>
			<MenuItem>First</MenuItem>
			<MenuItem>Second</MenuItem>
			<MenuSub label="More">
				<MenuItem>Nested</MenuItem>
				<MenuItem>Nested two</MenuItem>
			</MenuSub>
		</>
	)

	async function leave() {
		await userEvent.hover(screen.getByTestId('outside'))

		await frames()
	}

	async function openContextMenu() {
		renderUI(
			<>
				<Menu>
					<div data-testid="surface" style={{ width: 300, height: 200 }}>
						Surface
					</div>
					<MenuContent aria-label="Actions">{rows}</MenuContent>
				</Menu>
				{outside}
			</>,
		)

		const surface = screen.getByTestId('surface')

		const at = getCenter(surface)

		fireEvent.contextMenu(surface, { clientX: at.x, clientY: at.y })

		await waitFor(() => expect(row('First')).toBeVisible())

		await frames()
	}

	it('clears the active row of a dropdown, and ArrowDown starts at the first row', async () => {
		renderUI(
			<>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<button type="button">Open</button>
					</MenuTrigger>
					<MenuContent>{rows}</MenuContent>
				</Menu>
				{outside}
			</>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		await waitFor(() => expect(row('Second')).toBeVisible())

		await frames()

		await userEvent.hover(row('Second'))

		await waitFor(() => expect(row('Second')).toHaveAttribute('data-active'))

		await leave()

		expect(screen.getByRole('menu').querySelector('[data-active]')).toBeNull()

		expect(trigger).not.toHaveAttribute('aria-activedescendant')

		expect(trigger).toHaveFocus()

		await userEvent.keyboard('{ArrowDown}')

		expect(row('First')).toHaveAttribute('data-active')

		expect(trigger).toHaveAttribute('aria-activedescendant', row('First').id)
	})

	it('moves focus to the panel of a context menu, and ArrowDown starts at the first row', async () => {
		await openContextMenu()

		await userEvent.hover(row('Second'))

		await waitFor(() => expect(row('Second')).toHaveFocus())

		await leave()

		expect(screen.getByRole('menu', { name: 'Actions' })).toHaveFocus()

		await userEvent.keyboard('{ArrowDown}')

		expect(row('First')).toHaveFocus()
	})

	// The submenu is a level of its own. Its rows lose the cursor, the parent row
	// keeps its open submenu, and the arrows start again at the first row of the
	// submenu. A row of the menu then takes the cursor back and closes it.
	it('clears the rows of a submenu, and keeps the submenu open', async () => {
		await openContextMenu()

		await userEvent.hover(row(/More/))

		await waitFor(() => expect(row('Nested two')).toBeVisible())

		await frames()

		await userEvent.hover(row('Nested two'))

		await waitFor(() => expect(row('Nested two')).toHaveFocus())

		await leave()

		const submenu = screen.getByRole('menu', { name: /More/ })

		expect(submenu).toHaveFocus()

		expect(row(/More/)).toHaveAttribute('aria-expanded', 'true')

		await userEvent.keyboard('{ArrowDown}')

		expect(row('Nested')).toHaveFocus()

		await userEvent.hover(row('First'))

		await waitFor(() => expect(row('First')).toHaveFocus())

		expect(row(/More/)).toHaveAttribute('aria-expanded', 'false')
	})
})
