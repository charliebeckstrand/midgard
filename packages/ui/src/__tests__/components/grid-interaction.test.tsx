import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

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
