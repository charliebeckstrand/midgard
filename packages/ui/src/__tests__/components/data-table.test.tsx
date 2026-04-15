import { describe, expect, it } from 'vitest'
import { DataTable } from '../../components/data-table'
import { bySlot, renderUI, screen } from '../helpers'

describe('DataTable', () => {
	const columns = [
		{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
		{ id: 'age', title: 'Age', cell: (row: { age: number }) => row.age },
	]

	const rows = [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
	]

	const getRowKey = (row: { name: string }) => row.name

	it('renders with data-slot="data-table"', () => {
		const { container } = renderUI(
			<DataTable columns={columns} rows={rows} getRowKey={getRowKey} />,
		)

		const el = bySlot(container, 'data-table')

		expect(el).toBeInTheDocument()
	})

	it('renders column headers', () => {
		renderUI(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} />)

		expect(screen.getByText('Name')).toBeInTheDocument()

		expect(screen.getByText('Age')).toBeInTheDocument()
	})

	it('renders row data', () => {
		renderUI(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByText('30')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<DataTable columns={columns} rows={rows} getRowKey={getRowKey} className="custom" />,
		)

		expect(container.querySelector('.custom')).toBeInTheDocument()
	})

	it('shows loading spinner when loading', () => {
		renderUI(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} loading />)

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})
})
