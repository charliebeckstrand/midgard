import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; role: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Developer' },
	{ id: 2, name: 'Bob', role: 'Designer' },
	{ id: 3, name: 'Carol', role: 'Developer' },
]

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
]

/**
 * Every group starts open. The first toggle closes one group, and each other
 * group stays open, also a group that a search hides at that time.
 */
describe('Grid group expansion under a search', () => {
	it('keeps a group that the search hides open after the first toggle', () => {
		const view = (query: string) => (
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				search={{ value: query }}
			/>
		)

		const { rerender } = renderUI(view('Alice'))

		// The search keeps Developer alone. Close it.
		fireEvent.click(screen.getByRole('button', { name: 'Collapse group Developer' }))

		rerender(view(''))

		expect(screen.getByRole('button', { name: 'Collapse group Designer' })).toBeInTheDocument()
	})
})
