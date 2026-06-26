import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

describe('Grid per-column filters', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			filterable: true,
		},
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	it('renders a filter input only for filterable columns', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('searchbox', { name: 'Filter Name' })).toBeInTheDocument()

		expect(screen.queryByRole('searchbox', { name: 'Filter Role' })).not.toBeInTheDocument()
	})

	it('renders no filter row when no column is filterable', () => {
		const plain = columns.map((col) => ({ ...col, filterable: false }))

		renderUI(<Grid columns={plain} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
	})

	it('filters rows client-side as you type', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await user.type(screen.getByRole('searchbox', { name: 'Filter Name' }), 'Alice')

		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.queryByText('Bob')).not.toBeInTheDocument()
	})

	it('reflects and applies a controlled column filter', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: 'Bob' }] }}
			/>,
		)

		expect(screen.getByRole('searchbox', { name: 'Filter Name' })).toHaveValue('Bob')

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('does not filter client-side in manual (server) mode', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ manual: true, onValueChange }}
			/>,
		)

		await user.type(screen.getByRole('searchbox', { name: 'Filter Name' }), 'Alice')

		// The engine leaves rows untouched; the consumer would refetch from the filters.
		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(onValueChange).toHaveBeenCalled()
	})
})
