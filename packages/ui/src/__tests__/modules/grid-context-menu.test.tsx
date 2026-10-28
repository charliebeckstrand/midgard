import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridSortState } from '../../modules/grid'
import { createGroup, createRule, type QueryField } from '../../modules/query'
import { act, fireEvent, present, renderUI, screen, setupUser } from '../helpers'

describe('Grid context menus', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	// Name is groupable, Role is not: for the header menu's group-by item.
	const groupableColumns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			groupable: true,
		},
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

	/** Opens one of the menu's hover-opened parents (Sort / Pin / Export / Auto-size). */
	const openSubmenu = (name: string) => {
		fireEvent.click(screen.getByRole('menuitem', { name }))
	}

	it('opens a column menu with sort controls on a header right-click', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ column: true }} />)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		rightClick('columnheader', 'Name')

		// The sort controls are consolidated under a Sort parent, not spilled onto
		// the top level.
		expect(screen.queryByRole('menuitem', { name: 'Sort ascending' })).not.toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Sort' })).toHaveAttribute('aria-haspopup', 'menu')

		openSubmenu('Sort')

		expect(screen.getByRole('menuitem', { name: 'Sort ascending' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Sort descending' })).toBeInTheDocument()
	})

	// A context menu has no trigger to name it, so the grid names it by its target.
	it('names the column menu by its column', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ column: true }} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menu', { name: 'Name column menu' })).toBeInTheDocument()
	})

	it('names the cell menu', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ cell: true }} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menu', { name: 'Cell menu' })).toBeInTheDocument()
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

		openSubmenu('Sort')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Sort descending' }))

		expect(onValueChange).toHaveBeenCalledWith<[GridSortState[]]>([
			{ column: 'name', direction: 'desc' },
		])
	})

	it('offers "Group by “{column}”" on a groupable header when the group button is on', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={groupableColumns}
				rows={rows}
				getKey={getKey}
				contextMenu={{ column: true }}
				groupBy={{ value: null, onValueChange, groupButton: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		// The column name is quoted, as the filter row quotes it, so the name reads as
		// the column acted on rather than as part of the item's own wording.
		fireEvent.click(screen.getByRole('menuitem', { name: 'Group by “Name”' }))

		expect(onValueChange).toHaveBeenCalledWith('name')
	})

	it('flips the group item to a plain "Ungroup" once the column is the active group', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={groupableColumns}
				rows={rows}
				getKey={getKey}
				contextMenu={{ column: true }}
				groupBy={{ value: 'name', onValueChange, groupButton: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		// The grouped column drops "Group by" for a bare "Ungroup".
		expect(screen.queryByRole('menuitem', { name: 'Group by “Name”' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Ungroup' }))

		expect(onValueChange).toHaveBeenCalledWith(null)
	})

	it('shows no group item on a non-groupable column, or with the group button off', () => {
		const { rerender } = renderUI(
			<Grid
				columns={groupableColumns}
				rows={rows}
				getKey={getKey}
				contextMenu={{ column: true }}
				groupBy={{ value: null, onValueChange: () => {}, groupButton: true }}
			/>,
		)

		// Role isn't groupable: its header carries no group item.
		rightClick('columnheader', 'Role')

		expect(screen.queryByRole('menuitem', { name: 'Group by “Role”' })).not.toBeInTheDocument()

		// With the group button off, the groupable column offers none either.
		rerender(
			<Grid
				columns={groupableColumns}
				rows={rows}
				getKey={getKey}
				contextMenu={{ column: true }}
				groupBy={{ value: null, onValueChange: () => {} }}
			/>,
		)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menuitem', { name: 'Group by “Name”' })).not.toBeInTheDocument()
	})

	it('opens a cell menu with Copy by default on a body-cell right-click', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ cell: true }} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('opens the cell menu at the active cell from a keyboard context-menu event', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable contextMenu={{ cell: true }} />,
		)

		const grid = screen.getByRole('grid')

		// Seat the cursor on a cell (keydown seeds it; the active cell carries
		// `data-active`, which the retarget reads).
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		// Shift+F10 / the ContextMenu key fires a contextmenu on the focused grid (not
		// a cell); the menu retargets it to the active cell rather than the native menu.
		fireEvent.contextMenu(grid)

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	// An applied filter marks its header button `data-active`, the attribute that
	// the cursor cell carries. The header comes first inside the grid, so a bare
	// attribute query found the button and opened no cell menu.
	it('retargets a keyboard context-menu event past an applied filter button', () => {
		const nameField: QueryField = { name: 'name', label: 'Name', type: 'text' }

		const filterable = columns.map((column) =>
			column.id === 'name' ? { ...column, filterable: true } : column,
		)

		const nameHasA = createGroup('and', [
			{ ...createRule(nameField), operator: 'contains', value: 'A' },
		])

		renderUI(
			<Grid
				columns={filterable}
				rows={rows}
				getKey={getKey}
				navigable
				contextMenu={{ cell: true }}
				columnFilters={{ value: [{ id: 'name', value: nameHasA }] }}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Filter Name, active' })).toBeInTheDocument()

		const grid = screen.getByRole('grid')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.contextMenu(grid)

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	// A right-click on a cell with no menu of its own fell back to the keyboard
	// path, and opened the menu of the cursor's cell there instead.
	it('keeps the native menu on a right-click in an open cell editor', () => {
		renderUI(
			<Grid
				columns={columns.map((column) => ({ ...column, field: column.id as keyof Row }))}
				rows={rows}
				getKey={getKey}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
				contextMenu={{ cell: true }}
			/>,
		)

		fireEvent.doubleClick(screen.getByText('Alice'))

		const editor = screen.getByDisplayValue('Alice')

		// A default the grid did not prevent opens the browser's own menu.
		expect(fireEvent.contextMenu(editor)).toBe(true)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('keeps the native menu on a right-click in a non-data cell, with a cursor cell seated', () => {
		renderUI(
			<Grid
				columns={[
					{ id: 'select', selectable: true },
					...columns,
					{ id: 'actions', actions: () => <button type="button">Edit</button> },
				]}
				rows={rows}
				getKey={getKey}
				navigable
				contextMenu={{ cell: true }}
			/>,
		)

		fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown' })

		fireEvent.contextMenu(screen.getAllByRole('button', { name: 'Edit' })[0] as HTMLElement)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		fireEvent.contextMenu(screen.getAllByRole('checkbox', { name: /Select/ })[1] as HTMLElement)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		// The keyboard event on the grid itself still opens the cursor cell's menu.
		fireEvent.contextMenu(screen.getByRole('grid'))

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	// A grouped leaf row marked every cell as a data cell, so an actions cell
	// opened a Copy menu with nothing to copy.
	it('keeps the native menu on a right-click in a non-data cell of a grouped leaf row', () => {
		const { container } = renderUI(
			<Grid
				columns={[
					...columns,
					{ id: 'actions', actions: () => <button type="button">Edit</button> },
				]}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'role', onValueChange: () => {} }}
				contextMenu={{ cell: true }}
			/>,
		)

		const actionsCell = present(
			screen.getAllByRole('button', { name: 'Edit' })[0]?.closest('td'),
			'a leaf actions cell',
		)

		fireEvent.contextMenu(actionsCell)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		// A data cell of the same row still opens its Copy menu.
		const name = present(
			container.querySelector<HTMLElement>('tr[data-grid-row] td[data-grid-col="name"]'),
			'a leaf Name cell',
		)

		fireEvent.contextMenu(name)

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('opens the group menu from a keyboard context-menu event on a group header', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				navigable
				groupBy={{ value: 'role', onValueChange: () => {} }}
			/>,
		)

		const grid = screen.getByRole('treegrid')

		// The cursor seats on the first row, a group header.
		fireEvent.focus(grid)

		const active = present(
			grid.querySelector<HTMLElement>('[role="gridcell"][data-active]'),
			'the cursor cell',
		)

		expect(active.closest('tr')).toHaveAttribute('data-group-row')

		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

		act(() => {
			grid.dispatchEvent(event)
		})

		// The grid takes the event, so the native menu stays shut.
		expect(event.defaultPrevented).toBe(true)

		const keyboard = screen.getAllByRole('menuitem').map((item) => item.textContent)

		expect(keyboard.length).toBeGreaterThan(0)

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

		// The same menu a right-click on the row opens.
		fireEvent.contextMenu(
			present(container.querySelector('tr[data-group-row] td'), 'a header cell'),
		)

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(keyboard)
	})

	it('keeps the native menu when a keyboard context-menu event has no active cell', () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable contextMenu={{ cell: true }} />,
		)

		const grid = screen.getByRole('grid')

		// Never navigated: no active cell, so nothing to anchor to and no custom menu
		// opens (the browser's native menu stands).
		fireEvent.contextMenu(grid)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	// Row roving focuses the row, not a cell, so the event lands on the `<tr>`.
	it('opens the cell menu of the first data cell from a keyboard context-menu event on a row', () => {
		const opened: { column: string; row: Row }[] = []

		renderUI(
			<Grid
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={getKey}
				onRowClick={vi.fn()}
				contextMenu={{
					cell: (context, defaults) => {
						opened.push({ column: String(context.column.id), row: context.row })

						return defaults
					},
				}}
			/>,
		)

		const row = present(screen.getByText('Bob').closest('tr'), 'tr')

		row.focus()

		expect(fireEvent.contextMenu(row)).toBe(false)

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()

		expect(opened).toEqual([{ column: 'name', row: rows[1] }])
	})

	// A detail panel can hold a nested grid that turns its menu off. Its header
	// and its cells carry column ids too, and an id can be the same as an id of
	// the outer grid. A right-click on them is not a right-click on the outer grid.
	it.each([
		['header', 'Note'],
		['cell', 'First note'],
	])('keeps the native menu on a %s of a grid nested in a detail row', (_kind, text) => {
		type Note = { id: number; text: string }

		const noteColumns: GridColumn<Note>[] = [
			{ id: 'name', title: 'Note', cell: (note) => note.text, value: (note) => note.text },
		]

		renderUI(
			<Grid
				columns={[{ id: 'expand', expander: true }, ...columns]}
				rows={rows}
				getKey={getKey}
				contextMenu={{ column: true, cell: true }}
				expandable={{
					defaultValue: new Set([1]),
					render: () => (
						<Grid
							columns={noteColumns}
							rows={[{ id: 1, text: 'First note' }]}
							getKey={(note) => note.id}
							contextMenu={false}
						/>
					),
				}}
			/>,
		)

		expect(fireEvent.contextMenu(present(screen.getAllByText(text)[0], text))).toBe(true)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
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
						{ key: 'flag', label: `Flag ${value}`, onAction: () => onFlag(row) },
					],
				}}
			/>,
		)

		rightClick('cell', 'Alice')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Flag Alice' }))

		expect(onFlag).toHaveBeenCalledWith(rows[0])
	})

	it('opens the column manager from the "Manage columns" item', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ column: true }} />)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Manage columns' }))

		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
	})

	it('omits "Manage columns" when the column manager is off', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnManager={false}
				contextMenu={{ column: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		// The header menu still opens its own controls; only management is gated off.
		expect(screen.getByRole('menuitem', { name: 'Sort' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Manage columns' })).not.toBeInTheDocument()
	})

	it('opens the menus by default with no contextMenu prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.getByRole('menuitem', { name: 'Sort' })).toBeInTheDocument()

		// "Manage columns" reaches the manager even without the toolbar button.
		expect(screen.getByRole('menuitem', { name: 'Manage columns' })).toBeInTheDocument()
	})

	it('opens the default cell menu with no contextMenu prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('adds "Export to CSV" to the cell menu when exportable', () => {
		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()

		openSubmenu('Export')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()
	})

	it('omits the Export menu from the cell menu when exportable is false', () => {
		renderUI(<Grid exportable={false} columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Export' })).not.toBeInTheDocument()
	})

	it('adds CSV and Excel under the cell menu Export by default with no exportable prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		openSubmenu('Export')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()
	})

	it('renders a lone export type as a plain row rather than a one-item Export menu', () => {
		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		rightClick('cell', 'Alice')

		// Nothing to disambiguate, so the single action stands on its own.
		expect(screen.queryByRole('menuitem', { name: 'Export' })).not.toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()
	})

	it('shows no menu when contextMenu is false', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={false} />)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	const nameHeader = () => {
		const header = screen
			.getAllByRole('columnheader')
			.find((element) => element.textContent?.includes('Name'))

		if (!header) throw new Error('no Name columnheader')

		return header
	}

	it('defers to the native menu on a Ctrl + right-click (button 2)', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// The secondary button held with Ctrl is the escape hatch to the browser menu.
		fireEvent.contextMenu(nameHeader(), { ctrlKey: true, button: 2 })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('opens the grid menu on a Ctrl + click (button 0, macOS secondary click)', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} contextMenu={{ column: true }} />)

		// A primary-button Ctrl+click is macOS's secondary click; it reaches the grid
		// menu rather than the native one, so Mac users get there without a right button.
		fireEvent.contextMenu(nameHeader(), { ctrlKey: true, button: 0 })

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('offers "Clear sort" only for the sorted column', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		rightClick('columnheader', 'Name')

		openSubmenu('Sort')

		expect(screen.getByRole('menuitem', { name: 'Clear sort' })).toBeInTheDocument()

		// A different, unsorted column's menu omits it, and opens its own Sort
		// menu fresh, rather than carrying the previous column's over.
		rightClick('columnheader', 'Role')

		expect(screen.queryByRole('menuitem', { name: 'Clear sort' })).not.toBeInTheDocument()

		openSubmenu('Sort')

		expect(screen.queryByRole('menuitem', { name: 'Clear sort' })).not.toBeInTheDocument()
	})

	it('withholds the direction a sorted column already carries', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		rightClick('columnheader', 'Name')

		openSubmenu('Sort')

		// Sorted ascending: the row that would repeat that sort stays out, leaving
		// the other direction and Clear sort.
		expect(screen.queryByRole('menuitem', { name: 'Sort ascending' })).not.toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Sort descending' })).toBeInTheDocument()

		// Sorting it the other way flips which row the menu withholds.
		fireEvent.click(screen.getByRole('menuitem', { name: 'Sort descending' }))

		rightClick('columnheader', 'Name')

		openSubmenu('Sort')

		expect(screen.getByRole('menuitem', { name: 'Sort ascending' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Sort descending' })).not.toBeInTheDocument()
	})

	it('keeps both directions for a column sorted within a multi-column sort', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{
					defaultValue: [
						{ column: 'name', direction: 'asc' },
						{ column: 'role', direction: 'asc' },
					],
				}}
			/>,
		)

		rightClick('columnheader', 'Role')

		openSubmenu('Sort')

		// Role sorts ascending, but each row collapses the sort onto Role alone:
		// neither repeats the two-column sort, so neither is withheld.
		expect(screen.getByRole('menuitem', { name: 'Sort ascending' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Sort descending' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Clear sort' })).toBeInTheDocument()
	})

	it('clears the active sort when "Clear sort" is chosen', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: [{ column: 'name', direction: 'asc' }], onValueChange }}
			/>,
		)

		rightClick('columnheader', 'Name')

		openSubmenu('Sort')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Clear sort' }))

		expect(onValueChange).toHaveBeenCalledWith([])
	})

	it('gathers the width actions under one Auto-size menu when resizable', () => {
		// A saved width, so the reset has a width to reset.
		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ defaultValue: { name: 160 } }}
			/>,
		)

		rightClick('columnheader', 'Name')

		openSubmenu('Auto-size')

		// The per-column fit leads, the grid-wide one follows, and the reset closes them out.
		const labels = ['Auto-size this column', 'Auto-size all columns', 'Reset column widths']

		const items = screen
			.getAllByRole('menuitem')
			.map((item) => item.textContent?.trim())
			.filter((label) => labels.includes(label ?? ''))

		expect(items).toEqual(labels)
	})

	it('omits the Auto-size menu when resizable is off', () => {
		renderUI(<Grid resizable={false} columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		expect(screen.queryByRole('menuitem', { name: 'Auto-size' })).not.toBeInTheDocument()
	})

	it('leads with "Manage columns" and rules off nothing', () => {
		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		const menu = screen.getByRole('menu')

		// The menu rows and any divider (an <hr>) in render order.
		const sequence = Array.from(menu.querySelectorAll('[role="menuitem"], hr'))

		// The table-wide manager reads first, then the clicked column's own
		// concerns, and no rule divides the defaults: a separator in a grid's menu
		// marks a host's custom items, nothing else.
		expect(sequence.map((node) => node.textContent?.trim())).toEqual([
			'Manage columns',
			'Sort',
			'Pin',
			'Auto-size',
			'Export',
		])
	})

	it('places the Auto-size menu directly under "Group by “{column}”"', () => {
		renderUI(
			<Grid
				resizable
				columns={groupableColumns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: null, onValueChange: vi.fn(), groupButton: true }}
			/>,
		)

		rightClick('columnheader', 'Name')

		const sequence = Array.from(screen.getByRole('menu').querySelectorAll('[role="menuitem"]'))

		const groupIndex = sequence.findIndex((node) => node.textContent?.trim() === 'Group by “Name”')

		const autoSizeIndex = sequence.findIndex((node) => node.textContent?.trim() === 'Auto-size')

		expect(groupIndex).toBeGreaterThanOrEqual(0)

		expect(autoSizeIndex).toBe(groupIndex + 1)
	})

	it.each([
		['a bound "Auto-size this column" when resizable', 'autoSizeColumn', true, 'function'],
		[
			'no "Reset column widths" while the widths are automatic',
			'resetColumnWidths',
			true,
			'undefined',
		],
		['no "Auto-size this column" when resizable is off', 'autoSizeColumn', false, 'undefined'],
	] as const)('hands a builder %s', (_, action, resizable, type) => {
		const seen: Array<(() => void) | undefined> = []

		renderUI(
			<Grid
				resizable={resizable}
				columns={columns}
				rows={rows}
				getKey={getKey}
				contextMenu={{
					column: (context, defaults) => {
						seen.push(context[action])

						return defaults
					},
				}}
			/>,
		)

		rightClick('columnheader', 'Name')

		expect(seen.at(-1)).toBeTypeOf(type)
	})

	it('hands a builder a bound "Reset column widths" while a column holds a saved width', () => {
		const seen: Array<(() => void) | undefined> = []

		renderUI(
			<Grid
				resizable
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnSizing={{ defaultValue: { name: 160 } }}
				contextMenu={{
					column: (context, defaults) => {
						seen.push(context.resetColumnWidths)

						return defaults
					},
				}}
			/>,
		)

		rightClick('columnheader', 'Name')

		expect(seen.at(-1)).toBeTypeOf('function')
	})

	it('shows "Reset column widths" only while a column holds a width of its own', async () => {
		const user = setupUser()

		renderUI(<Grid resizable columns={columns} rows={rows} getKey={getKey} />)

		const resetItem = () => {
			rightClick('columnheader', 'Name')

			openSubmenu('Auto-size')

			return screen.queryByRole('menuitem', { name: 'Reset column widths' })
		}

		expect(resetItem()).toBeNull()

		await user.keyboard('{Escape}{Escape}')

		// A keyboard nudge holds the widths.
		screen.getByRole('separator', { name: 'Resize Name' }).focus()

		await user.keyboard('{ArrowRight}')

		const reset = resetItem()

		expect(reset).not.toBeNull()

		fireEvent.click(reset as HTMLElement)

		expect(resetItem()).toBeNull()
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

		openSubmenu('Pin')

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Pin right' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Unpin' })).not.toBeInTheDocument()
	})

	it('offers Unpin and the opposite edge on a pinned column', () => {
		renderUI(<Grid columns={pinnedColumns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		openSubmenu('Pin')

		expect(screen.getByRole('menuitem', { name: 'Unpin' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Pin right' })).toBeInTheDocument()

		// A left-pinned column does not re-offer its own edge.
		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()
	})

	it('freezes a column to the left when Pin left is chosen', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(headerCell(container, 'name')?.className).not.toContain('sticky')

		rightClick('columnheader', 'Name')

		openSubmenu('Pin')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin left' }))

		const head = headerCell(container, 'name')

		expect(head?.className).toContain('sticky')

		expect(head?.style.insetInlineStart).toBe('0px')
	})

	it('releases a column when Unpin is chosen', () => {
		const { container } = renderUI(<Grid columns={pinnedColumns} rows={rows} getKey={getKey} />)

		expect(headerCell(container, 'name')?.className).toContain('sticky')

		rightClick('columnheader', 'Name')

		openSubmenu('Pin')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Unpin' }))

		const head = headerCell(container, 'name')

		expect(head?.className).not.toContain('sticky')

		expect(head?.style.insetInlineStart).toBe('')
	})

	it('seeds runtime pins from the pinning binding', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				pinning={{ defaultValue: { name: 'left' } }}
			/>,
		)

		expect(headerCell(container, 'name')?.className).toContain('sticky')
	})

	it('emits menu pin changes through the pinning binding', () => {
		const onValueChange = vi.fn()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} pinning={{ onValueChange }} />)

		rightClick('columnheader', 'Name')

		openSubmenu('Pin')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin left' }))

		expect(onValueChange).toHaveBeenCalledWith({ name: 'left' })
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
							onAction: pinRight,
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

	it('withholds the Pin menu on a locked column', () => {
		const lockedColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (row) => row.name,
				value: (row) => row.name,
				locked: 'left',
			},
			{ id: 'role', title: 'Role', cell: (row) => row.role },
		]

		renderUI(<Grid columns={lockedColumns} rows={rows} getKey={getKey} />)

		rightClick('columnheader', 'Name')

		// The Sort menu still shows; the Pin menu is withheld outright: a locked
		// freeze is immutable.
		expect(screen.getByRole('menuitem', { name: 'Sort' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Pin' })).not.toBeInTheDocument()
	})

	it('persists no pin that a builder requests on a locked column', () => {
		const lockedColumns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, locked: 'left' },
			{ id: 'role', title: 'Role', cell: (row) => row.role },
		]

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={lockedColumns}
				rows={rows}
				getKey={getKey}
				pinning={{ onValueChange }}
				contextMenu={{
					column: ({ pinRight }, defaults) => [
						...defaults,
						{ key: 'custom', label: 'Freeze right', onAction: pinRight },
					],
				}}
			/>,
		)

		rightClick('columnheader', 'Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Freeze right' }))

		// The lock outranks the pin, so the request changes no state.
		expect(onValueChange).not.toHaveBeenCalled()

		rightClick('columnheader', 'Role')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Freeze right' }))

		expect(onValueChange).toHaveBeenCalledWith({ role: 'right' })
	})
})
