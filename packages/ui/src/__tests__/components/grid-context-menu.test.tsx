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

	it('opens the menus by default with no contextMenu prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Sort Ascending' })).toBeInTheDocument()

		// "Choose Columns" reaches the manager even without the toolbar button.
		expect(screen.getByRole('menuitem', { name: 'Choose Columns' })).toBeInTheDocument()
	})

	it('opens the default cell menu with no contextMenu prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('shows no menu when contextMenu is false', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={false} />)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('defers to the native menu when Ctrl is held during the right-click', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const header = screen
			.getAllByRole('columnheader')
			.find((element) => element.textContent?.includes('Name'))

		if (!header) throw new Error('no Name columnheader')

		fireEvent.contextMenu(header, { ctrlKey: true })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('offers "Clear sort" only for the sorted column', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: { column: 'name', direction: 'asc' } }}
			/>,
		)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Clear sort' })).toBeInTheDocument()

		// A different, unsorted column's menu omits it.
		rightClick('columnheader', 'Role')

		expect(screen.queryByRole('menuitem', { name: 'Clear sort' })).not.toBeInTheDocument()
	})

	it('clears the active sort when "Clear sort" is chosen', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: { column: 'name', direction: 'asc' }, onValueChange }}
			/>,
		)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Clear sort' }))

		expect(onValueChange).toHaveBeenCalledWith(undefined)
	})

	it('adds "Auto-size columns" to the header menu when resizable', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Auto-size columns' })).toBeInTheDocument()
	})

	it('omits "Auto-size columns" when not resizable', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menuitem', { name: 'Auto-size columns' })).not.toBeInTheDocument()
	})

	const headerCell = (container: HTMLElement, id: string) =>
		container.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`)

	const pinnedColumns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			pinned: 'left',
		},
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	it('offers both edges and no Unpin on a scrolling column', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Pin Left' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Pin Right' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Unpin' })).not.toBeInTheDocument()
	})

	it('offers Unpin and the opposite edge on a pinned column', () => {
		renderUI(<Grid columns={pinnedColumns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Unpin' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Pin Right' })).toBeInTheDocument()

		// A left-pinned column does not re-offer its own edge.
		expect(screen.queryByRole('menuitem', { name: 'Pin Left' })).not.toBeInTheDocument()
	})

	it('freezes a column to the left when Pin Left is chosen', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headerCell(container, 'name')?.className).not.toContain('sticky')

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin Left' }))

		const head = headerCell(container, 'name')

		expect(head?.className).toContain('sticky')

		expect(head?.style.left).toBe('0px')
	})

	it('releases a column when Unpin is chosen', () => {
		const { container } = renderUI(<Grid columns={pinnedColumns} rows={rows} getKey={getKey} />)

		expect(headerCell(container, 'name')?.className).toContain('sticky')

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Unpin' }))

		const head = headerCell(container, 'name')

		expect(head?.className).not.toContain('sticky')

		expect(head?.style.left).toBe('')
	})

	it('exposes the pin state and actions to a column-menu builder', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				contextMenu={{
					column: ({ pinned, pinRight }, defaults) => [
						...defaults,
						{
							key: 'custom',
							label: pinned ? `Pinned ${pinned}` : 'Freeze right',
							onSelect: pinRight,
						},
					],
				}}
			/>,
		)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Freeze right' }))

		// The builder now reads the live pin side it just set.
		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Pinned right' })).toBeInTheDocument()
	})
})
