import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

describe('Grid client sorting', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			sortable: true,
		},
	]

	const rows: Row[] = [
		{ id: 1, name: 'Charlie' },
		{ id: 2, name: 'Alice' },
		{ id: 3, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	const order = () => screen.getAllByRole('cell').map((cell) => cell.textContent)

	it('sorts rows client-side (ascending) when manual is false', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: { column: 'name', direction: 'asc' }, manual: false }}
			/>,
		)

		expect(order()).toEqual(['Alice', 'Bob', 'Charlie'])
	})

	it('sorts descending', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: { column: 'name', direction: 'desc' }, manual: false }}
			/>,
		)

		expect(order()).toEqual(['Charlie', 'Bob', 'Alice'])
	})

	it('leaves row order to the consumer in manual (server) mode', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: { column: 'name', direction: 'asc' }, manual: true }}
			/>,
		)

		// Display-only: the grid does not reorder; the supplied order is preserved.
		expect(order()).toEqual(['Charlie', 'Alice', 'Bob'])
	})

	it('sorts client-side by default, falling back to the row field named by the column id', () => {
		const plainColumns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
		]

		renderUI(
			<Grid
				columns={plainColumns}
				rows={rows}
				getKey={getKey}
				sort={{ value: { column: 'name', direction: 'asc' } }}
			/>,
		)

		// No `value` accessor and no `manual`: the engine sorts by `row.name`.
		expect(order()).toEqual(['Alice', 'Bob', 'Charlie'])
	})
})
