import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type SortState } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Grid context menus', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	/** Right-clicks the first cell/header matching `role` whose text is `name`. */
	const rightClick = (role: 'columnheader' | 'cell', name: string) => {
		const node = screen.getAllByRole(role).find((element) => element.textContent?.includes(name))

		if (!node) throw new Error(`no ${role} containing "${name}"`)

		fireEvent.contextMenu(node)
	}

	it('opens a column menu with sort controls on a header right-click', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ column: true }} />)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Sort Ascending' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Sort Descending' })).toBeInTheDocument()
	})

	it('sorts the column when a sort item is chosen', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ onValueChange }}
				contextMenu={{ column: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Sort Descending' }))

		expect(onValueChange).toHaveBeenCalledWith<[SortState]>({ column: 'name', direction: 'desc' })
	})

	it('opens a cell menu with Copy by default on a body-cell right-click', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ cell: true }} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('passes the row and value to a cell-menu builder and runs a custom item', () => {
		const onFlag = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				contextMenu={{
					cell: ({ row, value }, defaults) => [
						...defaults,
						{ key: 'flag', label: `Flag ${value}`, onSelect: () => onFlag(row) },
					],
				}}
			/>,
		)

		rightClick('cell', 'Alice')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Flag Alice' }))

		expect(onFlag).toHaveBeenCalledWith(rows[0])
	})

	it('opens the column manager from the "Choose Columns" item', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnManager={{ enabled: true }}
				contextMenu={{ column: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Choose Columns' }))

		expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
	})

	it('shows no menu when contextMenu is not configured', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})
