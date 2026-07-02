import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * Row drag-reorder gating (the `rowReorder` binding + a `dragHandle` column). A
 * manual row order only holds against the natural order, so the grip is live
 * only when the rendered rows match the source set; otherwise it renders present
 * but disabled. The drag mechanics themselves ride `useSortableList` (covered by
 * its own tests) — here we pin the render gate, which is the grid's new logic.
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

		// The empty drag-handle header still names itself for assistive tech.
		expect(screen.getByText('Reorder rows')).toBeInTheDocument()
	})

	it('disables the grip while a column sort orders the rows', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
				rowReorder={{ onReorder: () => {} }}
			/>,
		)

		for (const handle of grips()) expect(handle).toBeDisabled()
	})

	it('disables the grip under pagination (rows are a page, not the full set)', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 2 } }}
				rowReorder={{ onReorder: () => {} }}
			/>,
		)

		for (const handle of grips()) expect(handle).toBeDisabled()
	})

	it('disables the grip when the binding is disabled', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				rowLabel={rowLabel}
				rowReorder={{ onReorder: () => {}, disabled: true }}
			/>,
		)

		for (const handle of grips()) expect(handle).toBeDisabled()
	})

	it('renders the inert grip when no rowReorder binding is supplied', () => {
		const onReorder = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} rowLabel={rowLabel} />)

		// The handle column still renders, but every grip is inert without the binding.
		for (const handle of grips()) expect(handle).toBeDisabled()

		expect(onReorder).not.toHaveBeenCalled()
	})
})
