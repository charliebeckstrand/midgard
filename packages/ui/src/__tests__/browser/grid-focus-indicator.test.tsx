import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, renderUI, screen, waitFor } from '../helpers'

/**
 * The focus indicator of a navigable grid (WCAG 2.4.7). The `<table>` is the
 * one tab stop, and the ring of the active cell shows the focus. Escape removes
 * the cursor while the focus stays on the table. The table then shows its own
 * inset ring, so the focus does not become invisible. The ring is a box shadow,
 * which jsdom does not compute, so the cases run in a real browser.
 */
describe('grid focus indicator (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [
		{ id: 1, name: 'Ada' },
		{ id: 2, name: 'Grace' },
	]

	/** Whether the table paints a ring of its own. */
	function tableRing(grid: HTMLElement): boolean {
		return getComputedStyle(grid).boxShadow !== 'none'
	}

	it('shows the ring of the table, not of a cell, after Escape removes the cursor', async () => {
		renderUI(
			<div>
				<button type="button">before</button>

				<Grid navigable columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		screen.getByRole('button', { name: 'before' }).focus()

		await userEvent.keyboard('{Tab}')

		const grid = screen.getByRole('grid')

		await waitFor(() => expect(grid).toHaveAttribute('aria-activedescendant'))

		await frames()

		// A cell is active, so its ring is the one indicator.
		expect(tableRing(grid)).toBe(false)

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(grid).not.toHaveAttribute('aria-activedescendant'))

		expect(document.activeElement).toBe(grid)

		await frames()

		expect(tableRing(grid)).toBe(true)
	})
})
