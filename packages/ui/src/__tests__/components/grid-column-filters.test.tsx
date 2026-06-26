import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { createGroup, createRule, type QueryField } from '../../modules/query'
import { fireEvent, renderUI, screen } from '../helpers'

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

	const nameField: QueryField = { name: 'name', label: 'Name', type: 'text' }

	/** A query that keeps only rows whose name contains `text`. */
	const nameContains = (text: string) =>
		createGroup('and', [{ ...createRule(nameField), operator: 'contains', value: text }])

	it('renders a filter button only for filterable columns', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('button', { name: 'Filter Name' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Filter Role' })).not.toBeInTheDocument()
	})

	it('renders no filter button when no column is filterable', () => {
		const plain = columns.map((col) => ({ ...col, filterable: false }))

		renderUI(<Grid columns={plain} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: /^Filter / })).not.toBeInTheDocument()
	})

	it('opens a single-column query builder — rules only, no field selector or groups', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()

		// Scoped to the column: no field picker, no nested groups.
		expect(screen.queryByRole('button', { name: 'Add group' })).not.toBeInTheDocument()

		const labels = Array.from(document.querySelectorAll('[data-slot="listbox-button"]'), (el) =>
			el.getAttribute('aria-label'),
		)

		expect(labels).not.toContain('Field')
	})

	it('applies a controlled column query client-side', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }] }}
			/>,
		)

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('does not filter client-side in manual (server) mode', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }], manual: true }}
			/>,
		)

		// The engine leaves rows untouched; the consumer filters server-side.
		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})
