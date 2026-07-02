import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Grid disables column interactions when empty', () => {
	type Row = { id: number; name: string; extra: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			sortable: true,
			filterable: true,
		},
		{ id: 'extra', title: 'Extra', cell: (row) => row.extra },
	]

	const getKey = (row: Row) => row.id

	const row: Row = { id: 1, name: 'Alice', extra: 'x' }

	it('hides the sort button but keeps the title', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

		expect(screen.getByText('Name')).toBeInTheDocument()
	})

	it('hides the per-column filter button', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Filter Name' })).not.toBeInTheDocument()
	})

	it('hides the resize separator', () => {
		const { container } = renderUI(<Grid resizable columns={columns} rows={[]} getKey={getKey} />)

		expect(container.querySelector('[role="separator"]')).toBeNull()
	})

	it('hides the reorder grips', () => {
		renderUI(<Grid reorder columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument()
	})

	it('suppresses the right-click context menu', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		const header = screen.getByText('Name').closest('th')

		if (!header) throw new Error('no header')

		fireEvent.contextMenu(header)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('restores the affordances once rows arrive', () => {
		const { rerender } = renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

		rerender(<Grid columns={columns} rows={[row]} getKey={getKey} />)

		expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Filter Name' })).toBeInTheDocument()
	})
})
