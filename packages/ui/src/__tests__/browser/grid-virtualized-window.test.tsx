import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * A virtualized grid renders a window of its rows, in a real browser. jsdom
 * lays out nothing, so no row measures, and the body holds its skeleton there.
 */
describe('grid virtualized window (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

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
})
