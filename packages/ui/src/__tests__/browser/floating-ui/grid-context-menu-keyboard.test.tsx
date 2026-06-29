import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen } from '../../helpers'

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

		const grid = container.querySelector<HTMLElement>('[role="grid"]') as HTMLTableElement

		// Seat the cursor on a cell.
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		const active = grid.getAttribute('aria-activedescendant')

		expect(active).toBeTruthy()

		// The keyboard contextmenu fires on the focused grid (not a cell); the menu
		// retargets to the active cell and opens, portaled by the real engine.
		fireEvent.contextMenu(grid)

		const menuItem = await screen.findByRole('menuitem', { name: 'Copy' })

		expect(menuItem.closest('[data-floating-ui-portal]')).not.toBeNull()

		// Focus moving into the portaled menu must not drop the cursor: the blur guard
		// keeps the active cell while a grid-opened overlay holds focus, so the menu
		// closes back onto it.
		fireEvent.blur(grid, { relatedTarget: menuItem })

		expect(grid).toHaveAttribute('aria-activedescendant', active)
	})
})
