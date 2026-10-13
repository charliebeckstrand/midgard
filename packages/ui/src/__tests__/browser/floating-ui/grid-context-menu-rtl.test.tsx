import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { LocaleProvider } from '../../../providers/locale'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * A keyboard context menu opens at the active cell. It anchors at the inline
 * start of the cell, so the menu covers the cell in both directions and does
 * not open past its inline end.
 */
describe('grid keyboard context menu anchor (real browser)', () => {
	// Room for the menu on each side of the grid, so `shift` does not move it.
	beforeAll(() => page.viewport(960, 640))

	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	it.each(['ltr', 'rtl'] as const)('opens over the active cell under %s', async (dir) => {
		renderUI(
			<LocaleProvider dir={dir}>
				<div style={{ width: '500px', margin: '0 auto' }}>
					<Grid
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						navigable
						contextMenu={{ cell: true }}
					/>
				</div>
			</LocaleProvider>,
		)

		const grid = screen.getByRole('grid')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		const cell = await waitFor(() => {
			const active = grid.querySelector<HTMLElement>('[role="gridcell"][data-active]')

			if (!active) throw new Error('no active cell')

			return active
		})

		fireEvent.contextMenu(grid)

		const menu = await screen.findByRole('menu')

		await waitFor(() => {
			const box = menu.getBoundingClientRect()

			const target = cell.getBoundingClientRect()

			// The start edge of the menu is near the start edge of the cell. The
			// panel insets its rows, so the edges are not exactly equal.
			const gap = dir === 'rtl' ? target.right - box.right : box.left - target.left

			expect(Math.abs(gap)).toBeLessThan(12)
		})
	})
})
