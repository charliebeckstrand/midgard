import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridProps } from '../../modules/grid'
import { createGroup, createRule } from '../../modules/query'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * Row drag-reorder gating (the `rowReorder` binding + a `dragHandle` column). A
 * manual row order only holds against the natural order, so the grip is live
 * only when the rendered rows match the source set; otherwise it renders present
 * but disabled. The drag mechanics themselves ride `useSortableList` (covered by
 * its own tests): here we pin the render gate, which is the grid's new logic.
 */
describe('Grid row reorder', () => {
	type Row = { name: string; age: number }

	const rows: Row[] = [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
		{ name: 'Carol', age: 40 },
	]

	const getKey = (row: Row) => row.name

	const rowLabel = (row: Row) => row.name

	const columns: GridColumn<Row>[] = [
		{ id: 'drag', dragHandle: true },
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			sortable: true,
			value: (row) => row.name,
		},
		{ id: 'age', title: 'Age', cell: (row) => row.age, sortable: true, value: (row) => row.age },
	]

	// A server-side filter needs a filterable column. The query keeps the rows
	// whose name holds "Al".
	const filterableColumns = columns.map((column) =>
		column.id === 'name' ? { ...column, filterable: true } : column,
	)

	const nameHoldsAl = createGroup('and', [
		{
			...createRule({ name: 'name', label: 'Name', type: 'text' }),
			operator: 'contains',
			value: 'Al',
		},
	])

	function grips() {
		return screen.getAllByRole('button', { name: /Reorder/ })
	}

	it('renders a live grip per row and names the reorder column', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				rowReorder={{ onReorder: () => {} }}
			/>,
		)

		const handles = grips()

		expect(handles).toHaveLength(3)

		for (const handle of handles) expect(handle).toBeEnabled()

		// The grip is a native `<button>`, so dnd-kit's `role="button"` is redundant.
		for (const handle of handles) expect(handle).not.toHaveAttribute('role')

		// The empty drag-handle header still names itself for assistive tech.
		expect(screen.getByText('Reorder rows')).toBeInTheDocument()
	})

	it('keeps the table and the focused sort button when a sort stands the reorder down', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				rowReorder={{ onReorder: () => {} }}
			/>,
		)

		const table = container.querySelector('table')

		const sort = screen.getByRole('button', { name: 'Sort by Name' })

		// The focus arms the truncation measure of the title, which updates state.
		act(() => sort.focus())

		fireEvent.click(sort)

		// The sort applies, and it only disables the grips: nothing remounts.
		expect(grips()[0]).toBeDisabled()

		expect(container.querySelector('table')).toBe(table)

		expect(sort.isConnected).toBe(true)

		expect(sort).toHaveFocus()
	})

	it.each<[string, Partial<GridProps<Row>>]>([
		[
			'while a column sort orders the rows',
			{ sort: { defaultValue: [{ column: 'name', direction: 'asc' }] } },
		],
		[
			'under pagination (rows are a page, not the full set)',
			{ pagination: { defaultValue: { pageIndex: 0, pageSize: 2 } } },
		],
		[
			'while master-detail is active (detail rows are not sortable items)',
			{
				columns: [{ id: 'expand', expander: true }, ...columns],
				expandable: { render: (row) => <div>{row.name}</div> },
			},
		],
		['when the binding is disabled', { rowReorder: { onReorder: () => {}, disabled: true } }],
		// The consumer feeds back only the matched rows, so the rendered rows and
		// the source rows have the same count.
		['under a server-side search with a query', { search: { manual: true, value: 'Al' } }],
		[
			'under a server-side column filter',
			{
				columns: filterableColumns,
				columnFilters: { manual: true, value: [{ id: 'name', value: nameHoldsAl }] },
			},
		],
	])('disables the grip %s', (_name, props) => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				rowReorder={{ onReorder: () => {} }}
				{...props}
			/>,
		)

		for (const handle of grips()) expect(handle).toBeDisabled()
	})

	it('keeps the grip live under a server-side search with no query', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				rowReorder={{ onReorder: () => {} }}
				search={{ manual: true, value: '' }}
			/>,
		)

		for (const handle of grips()) expect(handle).toBeEnabled()
	})

	it('renders the inert grip when no rowReorder binding is supplied', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} rowLabel={rowLabel} />)

		// The handle column still renders, but every grip is inert without the binding.
		for (const handle of grips()) expect(handle).toBeDisabled()
	})
})
