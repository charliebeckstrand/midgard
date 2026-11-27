import '../setup/grid-modules'
import { act, type ComponentProps, createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridCellClickContext, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, screen } from '../helpers'

type Row = {
	id: number | string
	name: string
	role: string
	/** Present on a group header row of the manual grouping. */
	group?: { key: string; count: number }
}

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
]

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Admin' },
	{ id: 2, name: 'Bob', role: 'User' },
	{ id: 3, name: 'Carol', role: 'User' },
]

const getKey = (row: Row) => row.id

const bodyRows = (table: HTMLElement) =>
	Array.from(table.querySelectorAll<HTMLElement>('tr[data-grid-row]'))

/** The roving data cells, without the label cell of a group header. */
const rovingCells = (table: HTMLElement) =>
	Array.from(table.querySelectorAll<HTMLElement>('tr[data-grid-row] > td[data-roving]'))

/** The group header row of the manual grouping. */
const headerRow = (table: HTMLElement) =>
	present(table.querySelector<HTMLElement>('tr[data-group-row]'), 'the group header row')

/** The roving item of the group header: its row in row mode, its label cell in cell mode. */
const headerItem = (table: HTMLElement) =>
	present(
		table.querySelector<HTMLElement>(
			'tr[data-group-row][data-roving], tr[data-group-row] > td[data-roving]',
		),
		'the roving item of the group header',
	)

/**
 * The rows of a manual grouping: one group header with all three rows below
 * it. Manual grouping stands the cursor down, so a click handler roves there.
 */
const manualRows: Row[] = [
	{ id: 'g:all', name: 'All', role: '', group: { key: 'all', count: rows.length } },
	...rows,
]

const groupRow = (row: Row) =>
	row.group ? { key: row.group.key, value: row.name, count: row.group.count } : null

/** A grid that roves: the click handlers of `props` under manual grouping. */
function renderRoving(props: Partial<ComponentProps<typeof Grid<Row>>>) {
	return renderUI(
		<Grid
			columns={columns}
			rows={manualRows}
			getKey={getKey}
			groupBy={{ manual: true, value: 'role', groupRow, expanded: new Set(['all']) }}
			{...props}
		/>,
	)
}

describe('Grid click handlers', () => {
	it.each(['onRowClick', 'onCellClick', 'onRowDoubleClick', 'onCellDoubleClick'])(
		'turn the cursor on for %s: the grid is one tab stop',
		(handler) => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} {...{ [handler]: vi.fn() }} />)

			const grid = screen.getByRole('grid')

			expect(grid).toHaveAttribute('tabindex', '0')

			expect(grid.querySelectorAll('tbody [tabindex], [data-roving]')).toHaveLength(0)
		},
	)

	it('turns the cursor on for a virtualized grid', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				virtualize
				maxHeight="200px"
				onRowClick={vi.fn()}
			/>,
		)

		expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '0')

		expect(
			bodyRows(screen.getByRole('grid')).filter((row) => row.hasAttribute('tabindex')),
		).toEqual([])
	})

	it('fires the cell click then the row click on Enter', () => {
		const order: string[] = []

		const onCellClick = vi.fn((_cell: GridCellClickContext<Row>) => {
			order.push('cell')
		})

		const onRowClick = vi.fn((_row: Row) => {
			order.push('row')
		})

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellClick={onCellClick}
				onRowClick={onRowClick}
			/>,
		)

		const grid = screen.getByRole('grid')

		// Bob's Role cell.
		fireEvent.mouseDown(screen.getAllByRole('gridcell', { name: 'User' })[0] as HTMLElement)

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'role', rowKey: 2 })

		expect(order).toEqual(['cell', 'row'])
	})

	it('fires the double-click pair on Enter in a double-click-only grid', () => {
		const order: string[] = []

		const onCellDoubleClick = vi.fn((_cell: GridCellClickContext<Row>) => {
			order.push('cell')
		})

		const onRowDoubleClick = vi.fn((_row: Row) => {
			order.push('row')
		})

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellDoubleClick={onCellDoubleClick}
				onRowDoubleClick={onRowDoubleClick}
			/>,
		)

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Bob' }))

		fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' })

		expect(onCellDoubleClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'name', rowKey: 2 })

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toBe(rows[1])

		expect(order).toEqual(['cell', 'row'])
	})

	it('fires the click pair on Space and the double-click pair on Enter in a grid with both', () => {
		const onCellClick = vi.fn()

		const onRowClick = vi.fn()

		const onCellDoubleClick = vi.fn()

		const onRowDoubleClick = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellClick={onCellClick}
				onRowClick={onRowClick}
				onCellDoubleClick={onCellDoubleClick}
				onRowDoubleClick={onRowDoubleClick}
			/>,
		)

		const grid = screen.getByRole('grid')

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Bob' }))

		fireEvent.keyDown(grid, { key: ' ' })

		expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'name', rowKey: 2 })

		expect(onRowClick.mock.calls[0]?.[0]).toBe(rows[1])

		expect(onCellDoubleClick).not.toHaveBeenCalled()

		expect(onRowDoubleClick).not.toHaveBeenCalled()

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(onCellDoubleClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'name', rowKey: 2 })

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toBe(rows[1])

		expect(onCellClick).toHaveBeenCalledOnce()

		expect(onRowClick).toHaveBeenCalledOnce()
	})

	it('marks a row data-clickable for any click or double-click handler', () => {
		for (const handler of ['onRowClick', 'onCellClick', 'onRowDoubleClick', 'onCellDoubleClick']) {
			const { unmount } = renderUI(
				<Grid columns={columns} rows={rows} getKey={getKey} {...{ [handler]: vi.fn() }} />,
			)

			const rowEls = bodyRows(screen.getByRole('grid'))

			expect(rowEls.every((row) => row.hasAttribute('data-clickable'))).toBe(true)

			unmount()
		}
	})

	it('leaves a grid with no click handler a plain table', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const rowEls = bodyRows(screen.getByRole('table'))

		expect(rowEls).toHaveLength(3)

		expect(rowEls.every((row) => !row.hasAttribute('data-roving'))).toBe(true)

		expect(rowEls.every((row) => row.tabIndex === -1)).toBe(true)
	})

	it('keeps a clickable leaf of a client grouping out of the Tab order', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				onRowClick={vi.fn()}
			/>,
		)

		const leaves = Array.from(
			container.querySelectorAll<HTMLElement>('tr[data-grid-row]:not([data-group-row])'),
		)

		expect(leaves.length).toBeGreaterThan(0)

		// The cursor is the single Tab stop, as it is for a flat row.
		expect(leaves.filter((leaf) => leaf.hasAttribute('tabindex'))).toEqual([])
	})
})

describe('Grid row roving under manual grouping', () => {
	it('seats a single Tab stop across the group header and the clickable rows', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		// Exactly one resting stop (the group header, the first item); the rest are -1.
		expect(headerRow(table).tabIndex).toBe(0)

		expect(bodyRows(table).map((row) => row.tabIndex)).toEqual([-1, -1, -1])
	})

	it('moves focus with ArrowDown / ArrowUp, carrying the resting stop', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		const rowEls = bodyRows(table)

		act(() => headerRow(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(rowEls[1])

		// The roving hook carries the resting `tabIndex=0` to the focused row.
		expect(rowEls.map((row) => row.tabIndex)).toEqual([-1, 0, -1])

		expect(headerRow(table).tabIndex).toBe(-1)

		fireEvent.keyDown(table, { key: 'ArrowUp' })

		expect(document.activeElement).toBe(rowEls[0])
	})

	it('jumps to the last / first row with End / Home', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		const rowEls = bodyRows(table)

		act(() => headerRow(table).focus())

		fireEvent.keyDown(table, { key: 'End' })

		expect(document.activeElement).toBe(rowEls[2])

		fireEvent.keyDown(table, { key: 'Home' })

		expect(document.activeElement).toBe(headerRow(table))
	})

	it('rings a clickable row with an inset focus ring (clip-safe)', () => {
		renderRoving({ onRowClick: vi.fn() })

		// `focus.inset` (ring-inset), not the outset `focus.ring` the scroll wrapper clips.
		expect(screen.getByText('Alice').closest('tr')?.className).toContain('ring-inset')
	})

	it('activates the focused row on Enter in a double-click-only grid', () => {
		const onRowDoubleClick = vi.fn()

		renderRoving({ onRowDoubleClick })

		const rowEls = bodyRows(screen.getByRole('treegrid'))

		rowEls[1]?.focus()

		fireEvent.keyDown(rowEls[1] as HTMLElement, { key: 'Enter' })

		expect(onRowDoubleClick).toHaveBeenCalledOnce()

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toBe(rows[1])
	})

	it('fires the click on Space and the double-click on Enter on a roving row', () => {
		const onRowClick = vi.fn()

		const onRowDoubleClick = vi.fn()

		renderRoving({ onRowClick, onRowDoubleClick })

		const rowEls = bodyRows(screen.getByRole('treegrid'))

		rowEls[1]?.focus()

		fireEvent.keyDown(rowEls[1] as HTMLElement, { key: ' ' })

		expect(onRowClick.mock.calls[0]?.[0]).toBe(rows[1])

		expect(onRowDoubleClick).not.toHaveBeenCalled()

		fireEvent.keyDown(rowEls[1] as HTMLElement, { key: 'Enter' })

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toBe(rows[1])

		expect(onRowClick).toHaveBeenCalledOnce()
	})

	it('leaves a Ctrl, Meta, or Alt chord on a roving row to the browser', () => {
		const onRowClick = vi.fn()

		renderRoving({ onRowClick })

		const row = bodyRows(screen.getByRole('treegrid'))[0] as HTMLElement

		row.focus()

		for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
			expect(fireEvent.keyDown(row, { key: ' ', [modifier]: true })).toBe(true)
		}

		expect(onRowClick).not.toHaveBeenCalled()
	})
})

describe('Grid tab stops under roving', () => {
	const withButton: GridColumn<Row>[] = [
		...columns,
		{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
	]

	it('takes the controls of the rows out of the tab order', () => {
		renderRoving({ columns: withButton, onRowClick: vi.fn() })

		expect(screen.getByRole('button', { name: 'Edit Alice' })).toHaveAttribute('tabindex', '-1')
	})

	it.each([
		['the roved row', 'onRowClick', (text: string) => screen.getByText(text).closest('tr')],
		['a roved cell', 'onCellClick', (text: string) => screen.getByText(text).closest('td')],
	] as const)('opens the row of %s to Tab', (_name, handler, item) => {
		renderRoving({ columns: withButton, [handler]: vi.fn() })

		const table = screen.getByRole('treegrid')

		act(() => headerItem(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(item('Alice')).toHaveFocus()

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(item('Bob')).toHaveFocus()

		expect(screen.getByRole('button', { name: 'Edit Bob' })).not.toHaveAttribute('tabindex')

		expect(screen.getByRole('button', { name: 'Edit Alice' })).toHaveAttribute('tabindex', '-1')

		// The roving hook keeps its own Tab stop on the item.
		expect(item('Bob')).toHaveAttribute('tabindex', '0')
	})
})

describe('Grid cell roving under manual grouping', () => {
	it('makes the data cells a single-tab-stop 2D roving group', () => {
		renderRoving({ onCellClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		const cells = rovingCells(table)

		// 3 rows x 2 data columns, and the label cell of the group header, which
		// holds the one resting stop.
		expect(cells).toHaveLength(6)

		expect(headerItem(table).tabIndex).toBe(0)

		expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(0)
	})

	it('steps a column with Left/Right and a row with Up/Down', () => {
		renderRoving({ onCellClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		const cells = rovingCells(table)

		act(() => headerItem(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(cells[0])

		fireEvent.keyDown(table, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(cells[1])

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		// cols = 2, so Down from index 1 lands on index 3.
		expect(document.activeElement).toBe(cells[3])
	})

	it('activates the focused cell on Enter: cell click then row click', () => {
		const order: string[] = []

		const onCellClick = vi.fn((_cell: GridCellClickContext<Row>) => {
			order.push('cell')
		})

		const onRowClick = vi.fn((_row: Row) => {
			order.push('row')
		})

		renderRoving({ onCellClick, onRowClick })

		const cells = rovingCells(screen.getByRole('treegrid'))

		// Third row's Role cell (row-major index 5: rows 0..2 x cols name,role).
		cells[5]?.focus()

		fireEvent.keyDown(cells[5] as HTMLElement, { key: 'Enter' })

		expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({
			columnId: 'role',
			rowKey: 3,
			value: 'User',
		})

		expect(order).toEqual(['cell', 'row'])
	})

	it('takes precedence over row roving when both handlers are set', () => {
		renderRoving({ onCellClick: vi.fn(), onRowClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		// Cell mode: the cells are the roving items, the rows are not.
		expect(rovingCells(table).length).toBe(6)

		const rowEls = bodyRows(table)

		expect(rowEls).toHaveLength(3)

		expect(rowEls.every((row) => !row.hasAttribute('data-roving'))).toBe(true)
	})

	it('rings a rovable cell with an inset focus ring', () => {
		renderRoving({ onCellClick: vi.fn() })

		expect(screen.getByText('Alice').closest('td')?.className).toContain('ring-inset')
	})

	it('fires the double-click pair on Enter in a double-click-only grid', () => {
		const order: string[] = []

		const onCellDoubleClick = vi.fn((_cell: GridCellClickContext<Row>) => {
			order.push('cell')
		})

		const onRowDoubleClick = vi.fn((_row: Row) => {
			order.push('row')
		})

		renderRoving({ onCellDoubleClick, onRowDoubleClick })

		const cells = rovingCells(screen.getByRole('treegrid'))

		expect(cells).toHaveLength(6)

		cells[1]?.focus()

		fireEvent.keyDown(cells[1] as HTMLElement, { key: 'Enter' })

		expect(onCellDoubleClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'role', rowKey: 1 })

		expect(order).toEqual(['cell', 'row'])
	})

	it('fires the click on Space and the double-click on Enter in a roving cell', () => {
		const onCellClick = vi.fn()

		const onCellDoubleClick = vi.fn()

		renderRoving({ onCellClick, onCellDoubleClick })

		const cells = rovingCells(screen.getByRole('treegrid'))

		cells[0]?.focus()

		fireEvent.keyDown(cells[0] as HTMLElement, { key: ' ' })

		expect(onCellClick).toHaveBeenCalledOnce()

		expect(onCellDoubleClick).not.toHaveBeenCalled()

		fireEvent.keyDown(cells[0] as HTMLElement, { key: 'Enter' })

		expect(onCellDoubleClick).toHaveBeenCalledOnce()

		expect(onCellClick).toHaveBeenCalledOnce()
	})

	it('leaves a Ctrl, Meta, or Alt chord on a roving cell to the browser', () => {
		const onCellClick = vi.fn()

		renderRoving({ onCellClick })

		const cell = rovingCells(screen.getByRole('treegrid'))[0] as HTMLElement

		cell.focus()

		for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
			expect(fireEvent.keyDown(cell, { key: 'Enter', [modifier]: true })).toBe(true)
		}

		expect(onCellClick).not.toHaveBeenCalled()
	})

	it("runs the handler of a column's cellProps, and lets it keep the key", () => {
		const onKeyDown = vi.fn((event: { key: string; preventDefault: () => void }) => {
			if (event.key === ' ') event.preventDefault()
		})

		const onCellClick = vi.fn()

		const keyed: GridColumn<Row>[] = [
			{ ...(columns[0] as GridColumn<Row>), cellProps: () => ({ onKeyDown }) },
			columns[1] as GridColumn<Row>,
		]

		const { container } = renderRoving({ columns: keyed, onCellClick })

		const cell = container.querySelector<HTMLElement>('td[data-roving][data-grid-col="name"]')

		fireEvent.keyDown(cell as HTMLElement, { key: 'Enter' })

		expect(onKeyDown).toHaveBeenCalledTimes(1)

		expect(onCellClick).toHaveBeenCalledTimes(1)

		// The column's handler prevents the default of Space, so the cell does not activate.
		fireEvent.keyDown(cell as HTMLElement, { key: ' ' })

		expect(onKeyDown).toHaveBeenCalledTimes(2)

		expect(onCellClick).toHaveBeenCalledTimes(1)
	})

	it('does not activate the cell when Enter lands on inner interactive content', () => {
		const onCellClick = vi.fn()

		renderRoving({
			columns: [
				columns[0] as GridColumn<Row>,
				{ id: 'action', title: 'Action', cell: (row) => <Button>Edit {row.name}</Button> },
			],
			onCellClick,
		})

		const button = screen.getByRole('button', { name: 'Edit Alice' })

		fireEvent.keyDown(button, { key: 'Enter' })

		expect(onCellClick).not.toHaveBeenCalled()
	})
})

/**
 * The group header of a manual grouping is a roving item, with the keys of a
 * group header of the cursor: Enter or Space toggles, ArrowRight opens a closed
 * group and steps into an open one, and ArrowLeft closes an open group.
 */
describe('Grid roving group headers under manual grouping', () => {
	/** A grid that roves, and holds its expansion in state, open at the start. */
	function renderHeaders(props: Partial<ComponentProps<typeof Grid<Row>>>) {
		function Owner() {
			const [expanded, setExpanded] = useState<Set<string | number>>(() => new Set(['all', 'more']))

			return (
				<Grid
					columns={columns}
					rows={manualRows}
					getKey={getKey}
					groupBy={{
						manual: true,
						value: 'role',
						groupRow,
						expanded,
						onExpandedChange: setExpanded,
					}}
					{...props}
				/>
			)
		}

		renderUI(<Owner />)

		return { table: screen.getByRole('treegrid') }
	}

	it.each([
		['row', { onRowClick: vi.fn() }],
		['cell', { onCellClick: vi.fn() }],
	] as const)('toggles the group with the keys of a %s-roving header', (_mode, props) => {
		const { table } = renderHeaders(props)

		const header = headerRow(table)

		act(() => headerItem(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowLeft' })

		expect(header).toBeCollapsed()

		// ArrowLeft on a closed group does nothing.
		fireEvent.keyDown(table, { key: 'ArrowLeft' })

		expect(header).toBeCollapsed()

		fireEvent.keyDown(table, { key: 'ArrowRight' })

		expect(header).toBeExpanded()

		fireEvent.keyDown(table, { key: 'Enter' })

		expect(header).toBeCollapsed()

		fireEvent.keyDown(table, { key: ' ' })

		expect(header).toBeExpanded()

		expect(headerItem(table)).toHaveFocus()
	})

	it('steps into an open group with ArrowRight, and back up to the header with ArrowUp', () => {
		const { table } = renderHeaders({ onRowClick: vi.fn() })

		act(() => headerItem(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowRight' })

		expect(bodyRows(table)[0]).toHaveFocus()

		fireEvent.keyDown(table, { key: 'ArrowUp' })

		expect(headerRow(table)).toHaveFocus()
	})

	it('keeps the column of a cell across the header in cell mode', () => {
		const { table } = renderHeaders({
			onCellClick: vi.fn(),
			rows: [
				...manualRows,
				{ id: 'g:more', name: 'More', role: '', group: { key: 'more', count: 1 } },
				{ id: 4, name: 'Dan', role: 'User' },
			],
		})

		const cells = rovingCells(table)

		act(() => headerItem(table).focus())

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		fireEvent.keyDown(table, { key: 'ArrowRight' })

		// Carol's Role cell, then the header of the second group, then Dan's Role cell.
		fireEvent.keyDown(table, { key: 'ArrowDown' })

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(cells[5]).toHaveFocus()

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(table.querySelectorAll('tr[data-group-row]')[1]?.querySelector('td')).toHaveFocus()

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(cells[7]).toHaveFocus()

		// ArrowDown on the last row wraps to the first item, the first header.
		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(headerItem(table)).toHaveFocus()
	})

	it('takes the disclosure button of a roving header out of the tab order', () => {
		const { table } = renderHeaders({ onRowClick: vi.fn() })

		expect(headerRow(table).querySelector('button')).toHaveAttribute('tabindex', '-1')

		// The header takes the focus ring, but no pointer cursor: only its button takes a click.
		expect(headerRow(table).className).toContain('ring-inset')

		expect(headerRow(table).className).not.toContain('cursor-pointer')
	})

	it('leaves the disclosure button of a header in the tab order without roving', () => {
		renderRoving({})

		expect(screen.getByRole('button', { name: /All/ })).not.toHaveAttribute('tabindex')
	})
})

describe("Grid table props beside the grid's own keyboard", () => {
	it.each([
		['row roving', true],
		['the cursor', false],
	] as const)("keeps the caller's ref and runs the caller's handlers under %s", (_name, roving) => {
		const ref = createRef<HTMLTableElement>()

		const onKeyDown = vi.fn()

		const onFocus = vi.fn()

		const props = { tableProps: { ref, onKeyDown, onFocus }, onRowClick: vi.fn() }

		if (roving) renderRoving(props)
		else renderUI(<Grid columns={columns} rows={rows} getKey={getKey} {...props} />)

		const table = screen.getByRole(roving ? 'treegrid' : 'grid')

		expect(ref.current).toBe(table)

		fireEvent.focus(table)

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(onFocus).toHaveBeenCalledTimes(1)

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})
})

describe('Grid roving semantics under manual grouping', () => {
	it.each([
		['row', { onRowClick: vi.fn() }],
		['cell', { onCellClick: vi.fn() }],
	] as const)('makes a %s-roving grid a named, read-only treegrid', (_mode, props) => {
		renderRoving(props)

		const table = screen.getByRole('treegrid', { name: 'Data grid' })

		expect(table).toHaveAttribute('aria-readonly', 'true')
	})

	it('gives the group header its level and expansion, and each leaf its level', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('treegrid')

		const header = table.querySelector('tr[data-group-row]')

		expect(header).toHaveAttribute('aria-level', '1')

		expect(header).toBeExpanded()

		expect(bodyRows(table).map((row) => row.getAttribute('aria-level'))).toEqual(['2', '2', '2'])
	})

	it('puts a leaf of a leading run with no header at level 1', () => {
		renderRoving({ onRowClick: vi.fn(), rows: [rows[0] as Row, ...manualRows] })

		const levels = bodyRows(screen.getByRole('treegrid')).map((row) =>
			row.getAttribute('aria-level'),
		)

		expect(levels).toEqual(['1', '2', '2', '2'])
	})

	it('leaves a manual grouping with no click handler a native table with no levels', () => {
		renderRoving({})

		const table = screen.getByRole('table')

		expect(table).not.toHaveAttribute('role')

		expect(table.querySelector('tr[aria-level], tr[aria-expanded]')).toBeNull()
	})
})
