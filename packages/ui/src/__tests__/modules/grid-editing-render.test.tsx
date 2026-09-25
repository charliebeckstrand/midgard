import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { allBySlot, renderUI } from '../helpers'

/**
 * The rows in edit mode ride the store of the editing session, and each cell
 * reads its own flag. A row that opens therefore renders only its own cells.
 */
describe('Grid editing rows', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({ id, name: `Name ${id}` }))

	it('renders only the cells of the row that opens', () => {
		const rendered: number[] = []

		const columns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => {
					rendered.push(row.id)

					return row.name
				},
			},
		]

		const grid = (open: Set<number>) => (
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ rows: open, onRowsChange: vi.fn(), onCommit: vi.fn() }}
			/>
		)

		const { container, rerender } = renderUI(grid(new Set()))

		expect(rendered.length).toBeGreaterThan(0)

		rendered.length = 0

		rerender(grid(new Set([3])))

		// The opened row mounts its editor, and no other row renders its cell.
		expect(allBySlot(container, 'grid-edit-input')).toHaveLength(1)

		expect(rendered.filter((id) => id !== 3)).toEqual([])
	})
})
