import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

describe('Grid search', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	it('renders a search field only when search is configured', () => {
		const { rerender } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

		rerender(<Grid columns={columns} rows={rows} getKey={getKey} search={{}} />)

		expect(screen.getByRole('searchbox')).toBeInTheDocument()
	})

	it('filters rows client-side as you type', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} search={{}} />)

		await user.type(screen.getByRole('searchbox'), 'Alice')

		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.queryByText('Bob')).not.toBeInTheDocument()
	})

	it('fires onValueChange with the query', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} search={{ value: '', onValueChange }} />,
		)

		await user.type(screen.getByRole('searchbox'), 'B')

		expect(onValueChange).toHaveBeenLastCalledWith('B')
	})

	it('does not filter client-side in manual (server) mode', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{ manual: true, onValueChange }}
			/>,
		)

		await user.type(screen.getByRole('searchbox'), 'Alice')

		// The engine leaves rows untouched; the consumer would refetch from the query.
		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(onValueChange).toHaveBeenCalled()
	})

	it('searches only columns that declare a value accessor', async () => {
		const user = userEvent.setup()

		type NoteRow = Row & { note: string }

		const withNote: GridColumn<NoteRow>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			{ id: 'note', title: 'Note', cell: (row) => row.note },
		]

		const noteRows: NoteRow[] = [
			{ id: 1, name: 'Alice', role: 'Developer', note: 'zzz' },
			{ id: 2, name: 'Bob', role: 'Designer', note: 'qqq' },
		]

		renderUI(<Grid columns={withNote} rows={noteRows} getKey={(row) => row.id} search={{}} />)

		await user.type(screen.getByRole('searchbox'), 'zzz')

		// `note` has no value accessor, so its content is not searched.
		expect(screen.queryByText('Alice')).not.toBeInTheDocument()

		expect(screen.queryByText('Bob')).not.toBeInTheDocument()
	})
})
