import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { GRID_SEARCH_DEBOUNCE_MS } from '../../modules/grid/grid-constants'
import { renderUI, screen, withFakeTime } from '../helpers'

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

	it('filters rows client-side once the query settles', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} search={{}} />)

			await clock.user.type(screen.getByRole('searchbox'), 'Alice')

			await clock.advance(GRID_SEARCH_DEBOUNCE_MS)

			expect(screen.getByText('Alice')).toBeInTheDocument()

			expect(screen.queryByText('Bob')).not.toBeInTheDocument()
		})
	})

	it('debounces the filter, holding every row until the query settles', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} search={{}} />)

			await clock.user.type(screen.getByRole('searchbox'), 'Alice')

			// Before the debounce elapses the engine has not re-filtered yet.
			await clock.advance(GRID_SEARCH_DEBOUNCE_MS - 1)

			expect(screen.getByText('Bob')).toBeInTheDocument()

			await clock.advance(1)

			expect(screen.queryByText('Bob')).not.toBeInTheDocument()
		})
	})

	it('fires onValueChange with the settled query', async () => {
		await withFakeTime(async (clock) => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					search={{ value: '', onValueChange }}
				/>,
			)

			await clock.user.type(screen.getByRole('searchbox'), 'B')

			await clock.advance(GRID_SEARCH_DEBOUNCE_MS)

			expect(onValueChange).toHaveBeenLastCalledWith('B')
		})
	})

	it('applies a cleared query immediately, recovering the hidden rows', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} search={{}} />)

			await clock.user.type(screen.getByRole('searchbox'), 'Alice')

			await clock.advance(GRID_SEARCH_DEBOUNCE_MS)

			expect(screen.queryByText('Bob')).not.toBeInTheDocument()

			await clock.user.click(screen.getByRole('button', { name: 'Clear search' }))

			// Clearing bypasses the debounce, so the rows return without advancing time.
			expect(screen.getByText('Bob')).toBeInTheDocument()
		})
	})

	it('does not filter client-side in manual (server) mode', async () => {
		await withFakeTime(async (clock) => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					search={{ manual: true, onValueChange }}
				/>,
			)

			await clock.user.type(screen.getByRole('searchbox'), 'Alice')

			await clock.advance(GRID_SEARCH_DEBOUNCE_MS)

			// The engine leaves rows untouched; the consumer would refetch from the query.
			expect(screen.getByText('Alice')).toBeInTheDocument()

			expect(screen.getByText('Bob')).toBeInTheDocument()

			expect(onValueChange).toHaveBeenCalled()
		})
	})

	it('searches only columns that declare a value accessor', async () => {
		await withFakeTime(async (clock) => {
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

			await clock.user.type(screen.getByRole('searchbox'), 'zzz')

			await clock.advance(GRID_SEARCH_DEBOUNCE_MS)

			// `note` has no value accessor, so its content is not searched.
			expect(screen.queryByText('Alice')).not.toBeInTheDocument()

			expect(screen.queryByText('Bob')).not.toBeInTheDocument()
		})
	})
})
