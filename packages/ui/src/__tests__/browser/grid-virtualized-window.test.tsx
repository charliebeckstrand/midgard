import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, renderUI, waitFor } from '../helpers'

/**
 * A virtualized grid renders a window of its rows, in a real browser. jsdom
 * lays out nothing, so no row measures, and the body holds its skeleton there.
 */
describe('grid virtualized window (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
		id: index + 1,
		name: `Name ${index + 1}`,
	}))

	it('renders only a subset of rows when virtualized', async () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={(row) => row.id} virtualize maxHeight="300px" />,
		)

		// A 300px viewport holds a few rows of 500, and the overscan adds a few more.
		await waitFor(() => {
			const rendered = container.querySelectorAll('tbody tr[data-grid-row]').length

			expect(rendered).toBeGreaterThan(0)

			expect(rendered).toBeLessThan(50)
		})
	})

	// The body reads `rowClassName` for each row it renders, so a call counts a
	// render of the window. A fresh `tableProps` object renders the grid again
	// but changes no prop of the body.
	it('renders no row when only the table props change', async () => {
		let calls = 0

		const rowClassName = () => {
			calls++

			return undefined
		}

		const getKey = (row: Row) => row.id

		const grid = () => (
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowClassName={rowClassName}
				tableProps={{ 'aria-label': 'Names' }}
				virtualize
				maxHeight="300px"
			/>
		)

		const { container, rerender } = renderUI(grid())

		await waitFor(() => {
			expect(container.querySelectorAll('tbody tr[data-grid-row]').length).toBeGreaterThan(0)
		})

		// The rows measure, and the window settles.
		await frames(3)

		calls = 0

		rerender(grid())

		await frames(2)

		expect(calls).toBe(0)
	})
})
