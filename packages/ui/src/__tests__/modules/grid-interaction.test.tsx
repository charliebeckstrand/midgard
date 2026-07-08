import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridCellClickContext, type GridColumn } from '../../modules/grid'
import { GRID_STATUS_DEBOUNCE_MS } from '../../modules/grid/grid-constants'
import { renderUI, screen, userEvent, withFakeTime } from '../helpers'

describe('Grid row click', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	it('fires onRowClick with the row datum when a cell is clicked', async () => {
		const user = userEvent.setup()

		const onRowClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={onRowClick} />)

		await user.click(screen.getByText('Alice'))

		expect(onRowClick).toHaveBeenCalledTimes(1)

		expect(onRowClick.mock.calls[0]?.[0]).toEqual(rows[0])
	})

	it('defers to interactive cell content rather than firing the row click', async () => {
		const user = userEvent.setup()

		const onRowClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={onRowClick} />)

		await user.click(screen.getByRole('button', { name: 'Edit Bob' }))

		expect(onRowClick).not.toHaveBeenCalled()
	})

	it('makes a clickable row keyboard-focusable and activates on Enter', async () => {
		const user = userEvent.setup()

		const onRowClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={onRowClick} />)

		const row = screen.getByText('Alice').closest('tr')

		expect(row).toHaveAttribute('tabindex', '0')

		row?.focus()

		await user.keyboard('{Enter}')

		expect(onRowClick).toHaveBeenCalledTimes(1)
	})

	it('leaves rows inert without a handler', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Alice').closest('tr')).not.toHaveAttribute('tabindex')
	})

	it('washes a clickable grid with the shared Table hover variant and a pointer cursor', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={vi.fn()} />,
		)

		// The hover wash rides the table element via the `<Table hover>` projection
		// rather than a per-row tint.
		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr]:hover:bg-zinc-950/5',
		)

		// The row keeps its own pointer cursor to read as actionable.
		expect(screen.getByText('Alice').closest('tr')?.className).toContain('cursor-pointer')
	})

	it('leaves the hover wash and pointer cursor off a grid with neither onRowClick nor hover', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(container.querySelector('table')?.className).not.toContain('hover:bg-zinc-950/5')

		expect(screen.getByText('Alice').closest('tr')?.className).not.toContain('cursor-pointer')
	})
})

describe('Grid cell click', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => `role:${row.role}` },
		{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Admin' },
		{ id: 2, name: 'Bob', role: 'User' },
	]

	const getKey = (row: Row) => row.id

	it('fires onCellClick with the cell context when a data cell is clicked', async () => {
		const user = userEvent.setup()

		const onCellClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={onCellClick} />)

		await user.click(screen.getByText('Alice'))

		expect(onCellClick).toHaveBeenCalledTimes(1)

		// The value falls back to the row field named by the column id.
		expect(onCellClick.mock.calls[0]?.[0]).toEqual({
			row: rows[0],
			rowKey: 1,
			columnId: 'name',
			value: 'Alice',
		})
	})

	it('reads the cell value through the column value accessor when set', async () => {
		const user = userEvent.setup()

		const onCellClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={onCellClick} />)

		await user.click(screen.getByText('User'))

		expect(onCellClick.mock.calls[0]?.[0]).toEqual({
			row: rows[1],
			rowKey: 2,
			columnId: 'role',
			value: 'role:User',
		})
	})

	it('fires the cell click ahead of the row click on the same click', async () => {
		const user = userEvent.setup()

		const order: string[] = []

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellClick={() => order.push('cell')}
				onRowClick={() => order.push('row')}
			/>,
		)

		await user.click(screen.getByText('Alice'))

		expect(order).toEqual(['cell', 'row'])
	})

	it('defers to interactive cell content rather than firing the cell click', async () => {
		const user = userEvent.setup()

		const onCellClick = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={onCellClick} />)

		await user.click(screen.getByRole('button', { name: 'Edit Bob' }))

		expect(onCellClick).not.toHaveBeenCalled()
	})

	it('fires from a grouped body leaf cell too', async () => {
		const user = userEvent.setup()

		const onCellClick = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				onCellClick={onCellClick}
			/>,
		)

		await user.click(screen.getByText('Alice'))

		expect(onCellClick).toHaveBeenCalledTimes(1)

		expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'name', rowKey: 1 })
	})

	it('washes a cell-clickable grid with the shared Table hover variant', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={vi.fn()} />,
		)

		expect(container.querySelector('table')?.className).toContain(
			'[&>tbody>tr]:hover:bg-zinc-950/5',
		)
	})
})

describe('Grid double click', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	it('fires onRowDoubleClick with the row datum', async () => {
		const user = userEvent.setup()

		const onRowDoubleClick = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} onRowDoubleClick={onRowDoubleClick} />,
		)

		await user.dblClick(screen.getByText('Alice'))

		expect(onRowDoubleClick).toHaveBeenCalledTimes(1)

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toEqual(rows[0])
	})

	it('fires onCellDoubleClick with the cell context, ahead of the row double-click', async () => {
		const user = userEvent.setup()

		const order: string[] = []

		const onCellDoubleClick = vi.fn((_cell: GridCellClickContext<Row>) => {
			order.push('cell')
		})

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellDoubleClick={onCellDoubleClick}
				onRowDoubleClick={() => order.push('row')}
			/>,
		)

		await user.dblClick(screen.getByText('Bob'))

		expect(order).toEqual(['cell', 'row'])

		expect(onCellDoubleClick.mock.calls[0]?.[0]).toEqual({
			row: rows[1],
			rowKey: 2,
			columnId: 'name',
			value: 'Bob',
		})
	})

	it('defers to interactive cell content rather than firing the double-click', async () => {
		const user = userEvent.setup()

		const onRowDoubleClick = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} onRowDoubleClick={onRowDoubleClick} />,
		)

		await user.dblClick(screen.getByRole('button', { name: 'Edit Bob' }))

		expect(onRowDoubleClick).not.toHaveBeenCalled()
	})
})

describe('Grid error state', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('shows a custom error node in place of the body', () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} error={<span>Fetch failed</span>} />,
		)

		expect(screen.getByText('Fetch failed')).toBeInTheDocument()

		// The error pre-empts the rows.
		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('renders a default alert for error={true}', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} error />)

		expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load data")
	})

	it('falls back to the rows when error is false', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} error={false} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('hides the resize separator while the error pre-empts the rows', () => {
		const sortable: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
		]

		const { container, rerender } = renderUI(
			<Grid
				resizable
				columns={sortable}
				rows={rows}
				getKey={getKey}
				error={<span>Fetch failed</span>}
			/>,
		)

		// The error replaces the body, so the header stands down just like the
		// empty state — no resize grip, no sort affordance.
		expect(container.querySelector('[role="separator"]')).toBeNull()

		expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

		// Clearing the error restores the affordances over the same rows.
		rerender(<Grid resizable columns={sortable} rows={rows} getKey={getKey} error={false} />)

		expect(container.querySelector('[role="separator"]')).not.toBeNull()

		expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
	})
})

describe('Grid pagination semantics', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name },
	]

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('narrows the select-all label to the page under pagination', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set() }}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 2 } }}
			/>,
		)

		expect(screen.getByLabelText('Select all rows on this page')).toBeInTheDocument()
	})

	it('emits windowed table semantics (role=table + full aria-rowcount) when paginated', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 2 } }}
			/>,
		)

		// A paginated but non-navigable grid is a windowed table, not a grid: role="grid"
		// is withheld until a keyboard cursor (`navigable`) backs it, while aria-rowcount
		// still reports the full set across pages.
		const table = screen.getByRole('table')

		expect(screen.queryByRole('grid')).not.toBeInTheDocument()

		// 4 data rows + the header row.
		expect(table).toHaveAttribute('aria-rowcount', '5')
	})

	it('keeps native table semantics for a plain, whole-set grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('grid')).not.toBeInTheDocument()

		expect(screen.getByLabelText('Select all rows')).toBeInTheDocument()
	})
})

describe('Grid row selection semantics', () => {
	type Row = { id: number; name: string }

	const selectableColumns: GridColumn<Row>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name },
	]

	const plainColumns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('reflects each selectable row state through aria-selected', () => {
		renderUI(
			<Grid
				columns={selectableColumns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set([2]) }}
			/>,
		)

		expect(screen.getByText('Person 2').closest('tr')).toHaveAttribute('aria-selected', 'true')

		expect(screen.getByText('Person 1').closest('tr')).toHaveAttribute('aria-selected', 'false')
	})

	it('omits aria-selected entirely when the grid has no selection column', () => {
		renderUI(<Grid columns={plainColumns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Person 1').closest('tr')).not.toHaveAttribute('aria-selected')
	})

	it('does not advertise aria-multiselectable on a plain selectable table', () => {
		// A plain selectable table exposes per-row aria-selected but is not a grid,
		// so aria-multiselectable (a grid-only state) is withheld.
		renderUI(
			<Grid
				columns={selectableColumns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set() }}
			/>,
		)

		expect(screen.getByRole('table')).not.toHaveAttribute('aria-multiselectable')
	})

	it('advertises aria-multiselectable on a navigable selectable grid', () => {
		renderUI(
			<Grid
				columns={selectableColumns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set() }}
				navigable
			/>,
		)

		expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true')
	})
})

describe('Grid busy live region', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	it('announces the settled row count to assistive tech', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

			// The polite status region settles (debounced) to the result count.
			await clock.advance(GRID_STATUS_DEBOUNCE_MS)

			expect(screen.getByText('2 rows')).toHaveClass('sr-only')
		})
	})

	it('announces No results for an empty grid', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

			await clock.advance(GRID_STATUS_DEBOUNCE_MS)

			expect(screen.getByText('No results')).toBeInTheDocument()
		})
	})
})
