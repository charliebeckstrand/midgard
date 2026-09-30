import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

type Row = { id: number; name: string; role: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Developer' },
	{ id: 2, name: 'Bob', role: 'Designer' },
]

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', field: 'name' },
	{ id: 'role', title: 'Role', field: 'role', groupable: true },
]

/**
 * The grid groups its own rows. Grouping by a column changes the rows, not the
 * order of the columns: the grouped column keeps its place.
 */
describe('Grid grouped column order', () => {
	it('keeps the grouped column in its place, after the selection column', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set<number>() }}
				groupBy={{ value: 'role' }}
			/>,
		)

		const ids = [...container.querySelectorAll<HTMLElement>('thead th')]
			.map((th) => th.getAttribute('data-grid-col') ?? (th.querySelector('input') ? 'select' : ''))
			.filter(Boolean)

		expect(ids).toEqual(['select', 'name', 'role'])
	})
})
