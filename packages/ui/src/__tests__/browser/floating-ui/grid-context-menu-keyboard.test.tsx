import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * Keyboard access to the grid's context menu against the real floating engine
 * (WCAG 2.1.1). Shift+F10 / the ContextMenu key fires a contextmenu on the
 * focused grid, not a cell; the menu retargets it to the active cursor cell,
 * opening through the menu's `openAt`. The jsdom suite mocks `@floating-ui/react`
 * (no portal boundary, no return-focus), so the portal-aware cursor guard and the
 * close-time focus restoration are exercised here.
 */
describe('grid context menu keyboard access (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	it('opens at the active cell and keeps the cursor when the menu takes focus', async () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable contextMenu={{ cell: true }} />,
		)

		const grid = present(container.querySelector('[role="grid"]'), '[role="grid"]')

		// Seat the cursor on a cell.
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		const active = grid.getAttribute('aria-activedescendant')

		expect(active).toBeTruthy()

		// The keyboard contextmenu fires on the focused grid (not a cell); the menu
		// retargets to the active cell and opens, portaled by the real engine.
		fireEvent.contextMenu(grid)

		const menuItem = await screen.findByRole('menuitem', { name: 'Copy' })

		expect(menuItem.closest('[data-floating-ui-portal]')).not.toBeNull()

		// The anchor sits inside the first-column cell. On the cell edge, which is
		// the edge of the scroll container, floating-ui hid the open menu.
		await waitFor(() => expect(screen.getByRole('menu')).toBeVisible())

		// Focus moving into the portaled menu must not drop the cursor: the blur guard
		// keeps the active cell while a grid-opened overlay holds focus, so the menu
		// closes back onto it.
		fireEvent.blur(grid, { relatedTarget: menuItem })

		expect(grid).toHaveAttribute('aria-activedescendant', active)
	})

	// Row roving focuses the row. The menu opens at its first data cell, and a
	// close puts focus back on the row, so the arrow keys pick up from it.
	it('opens from a focused roving row and returns focus to the row on close', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onRowClick={() => {}}
				contextMenu={{ cell: true }}
			/>,
		)

		present(screen.getByText('Alice').closest('tr'), 'tr').focus()

		await userEvent.keyboard('{ArrowDown}')

		const row = present(screen.getByText('Bob').closest('tr'), 'tr')

		expect(row).toHaveFocus()

		fireEvent.contextMenu(row)

		await screen.findByRole('menuitem', { name: 'Copy' })

		await waitFor(() => expect(screen.getByRole('menu')).toBeVisible())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()

			expect(row).toHaveFocus()
		})
	})
})
