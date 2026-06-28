import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen } from '../../helpers'

/**
 * An editable grid's keyboard cursor against the real floating engine. The jsdom
 * suite mocks `@floating-ui/react`, so the context menu renders inline with no
 * `data-floating-ui-portal` boundary; the cursor's portal-aware focus guard only
 * has a real portal to match here.
 */
describe('editable grid header menu focus (real browser)', () => {
	type Row = { id: number; state: string; rate: number }

	const rows: Row[] = [
		{ id: 1, state: 'CA', rate: 2.35 },
		{ id: 2, state: 'NV', rate: 2.2 },
		{ id: 3, state: 'AZ', rate: 2.1 },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'state', title: 'State', field: 'state', cell: (row) => row.state, readOnly: true },
		{ id: 'rate', title: 'Rate', field: 'rate', cell: (row) => String(row.rate) },
	]

	it('does not seat a cell when focus returns to the grid from a dismissed header menu', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ rows: new Set(), onValueChange: () => {} }}
			/>,
		)

		const grid = container.querySelector<HTMLElement>('[role="grid"]') as HTMLTableElement

		const header = container.querySelector<HTMLElement>('th[data-grid-col="rate"]')

		if (!header) throw new Error('no header for column "rate"')

		fireEvent.contextMenu(header)

		const menuItem = await screen.findByRole('menuitem', { name: 'Manage columns' })

		// The real engine portals the menu after the table in the DOM — the boundary
		// the cursor's focus guard keys off.
		expect(menuItem.closest('[data-floating-ui-portal]')).not.toBeNull()

		// Dismissing the menu by clicking the grid returns focus to the table from the
		// menu item. Without the guard the cameFromAfter heuristic seats the last cell
		// behind the menu; with it the cursor stays unseated.
		fireEvent.focus(grid, { relatedTarget: menuItem })

		expect(grid).not.toHaveAttribute('aria-activedescendant')

		expect(
			Array.from(container.querySelectorAll('[role="gridcell"]')).some((cell) =>
				cell.hasAttribute('data-active'),
			),
		).toBe(false)
	})
})
