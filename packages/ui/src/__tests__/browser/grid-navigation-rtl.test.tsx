import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

/**
 * In a right-to-left grid, the columns run from right to left. `ArrowLeft`
 * then moves the cursor to the next column, and `ArrowRight` to the previous
 * one (WAI-ARIA APG grid pattern). The group keys mirror in the same way.
 * Only a real browser computes the inherited `direction`, so the keys are
 * asserted here.
 */
describe('grid cursor keys in a right-to-left grid (real browser)', () => {
	type Sale = { id: number; region: string; units: number; note: string }

	const sales: Sale[] = [
		{ id: 1, region: 'West', units: 10, note: 'a' },
		{ id: 2, region: 'West', units: 30, note: 'b' },
		{ id: 3, region: 'East', units: 20, note: 'c' },
	]

	const columns: GridColumn<Sale>[] = [
		{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
		{ id: 'units', title: 'Units', cell: (row) => `${row.units} units`, value: (row) => row.units },
		{ id: 'note', title: 'Note', cell: (row) => row.note },
	]

	/** The cell that `aria-activedescendant` names. */
	const activeCell = (grid: HTMLElement) =>
		present(
			document.getElementById(grid.getAttribute('aria-activedescendant') ?? ''),
			'the active cell',
		)

	it('moves to the next column on ArrowLeft and back on ArrowRight', async () => {
		renderUI(
			<div dir="rtl">
				<Grid navigable columns={columns} rows={sales} getKey={(row) => row.id} />
			</div>,
		)

		const grid = screen.getByRole('grid')

		const press = async (key: string, col: string) => {
			fireEvent.keyDown(grid, { key })

			await waitFor(() => expect(activeCell(grid).dataset.gridCol).toBe(col))
		}

		grid.focus()

		await press('ArrowDown', 'region')

		await press('ArrowLeft', 'units')

		await press('ArrowLeft', 'note')

		// The next column is also further to the left on screen.
		const note = activeCell(grid).getBoundingClientRect()

		await press('ArrowRight', 'units')

		expect(activeCell(grid).getBoundingClientRect().left).toBeGreaterThan(note.left)

		await press('ArrowRight', 'region')

		// Home and End reach the start and the end of the row.
		await press('End', 'note')

		await press('Home', 'region')
	})

	it('opens a closed group on ArrowLeft and closes an open one on ArrowRight', async () => {
		renderUI(
			<div dir="rtl">
				<Grid
					navigable
					columns={columns}
					rows={sales}
					getKey={(row) => row.id}
					groupBy={{ value: 'region' }}
				/>
			</div>,
		)

		const grid = screen.getByRole('treegrid')

		grid.focus()

		await waitFor(() => expect(activeCell(grid).closest('tr')).toHaveAttribute('data-group-row'))

		const header = () => present(activeCell(grid).closest('tr'), 'the header row')

		expect(header()).toHaveAttribute('aria-expanded', 'true')

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		await waitFor(() => expect(header()).toHaveAttribute('aria-expanded', 'false'))

		fireEvent.keyDown(grid, { key: 'ArrowLeft' })

		await waitFor(() => expect(header()).toHaveAttribute('aria-expanded', 'true'))

		// On an open group, ArrowLeft steps into its first leaf.
		fireEvent.keyDown(grid, { key: 'ArrowLeft' })

		await waitFor(() => expect(activeCell(grid)).toHaveTextContent(/^West$/))
	})
})
