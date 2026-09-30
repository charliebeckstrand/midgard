import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI } from '../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', field: 'name' }]

/**
 * An editable grid carries the cursor, so it takes the `grid` role. The role
 * promises the grid semantics: the row and column counts on the table and an
 * index on each row. They follow the cursor, not `navigable` alone.
 */
describe('Grid semantics of an editable grid', () => {
	it('gives an editable grid that is not navigable its row and column counts', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onRowsChange: vi.fn(), onCommit: vi.fn() }}
			/>,
		)

		const table = present(container.querySelector('table'), 'table')

		expect(table.getAttribute('role')).toBe('grid')

		expect(table.getAttribute('aria-rowcount')).not.toBeNull()

		expect(table.getAttribute('aria-colcount')).toBe('1')

		const bodyRow = present(container.querySelector('tbody tr'), 'body row')

		expect(bodyRow.getAttribute('aria-rowindex')).toBe('2')
	})
})
