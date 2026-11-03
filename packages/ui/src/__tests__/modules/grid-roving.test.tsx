import { act, type ComponentProps, createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridCellClickContext, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

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

const rovingCells = (table: HTMLElement) =>
	Array.from(table.querySelectorAll<HTMLElement>('td[data-roving]'))

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

	it('keeps Enter on the click handler when the grid also has a double-click handler', () => {
		const onCellClick = vi.fn()

		const onCellDoubleClick = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellClick={onCellClick}
				onCellDoubleClick={onCellDoubleClick}
			/>,
		)

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' })

		expect(onCellClick).toHaveBeenCalledOnce()

		expect(onCellDoubleClick).not.toHaveBeenCalled()
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
	it('seats a single Tab stop across the clickable rows', () => {
		renderRoving({ onRowClick: vi.fn() })

		// Exactly one resting stop (the first row); the rest are -1.
		expect(bodyRows(screen.getByRole('table')).map((row) => row.tabIndex)).toEqual([0, -1, -1])
	})

	it('moves focus with ArrowDown / ArrowUp, carrying the resting stop', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('table')

		const rowEls = bodyRows(table)

		rowEls[0]?.focus()

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(rowEls[1])

		// The roving hook carries the resting `tabIndex=0` to the focused row.
		expect(rowEls.map((row) => row.tabIndex)).toEqual([-1, 0, -1])

		fireEvent.keyDown(table, { key: 'ArrowUp' })

		expect(document.activeElement).toBe(rowEls[0])
	})

	it('jumps to the last / first row with End / Home', () => {
		renderRoving({ onRowClick: vi.fn() })

		const table = screen.getByRole('table')

		const rowEls = bodyRows(table)

		rowEls[0]?.focus()

		fireEvent.keyDown(table, { key: 'End' })

		expect(document.activeElement).toBe(rowEls[2])

		fireEvent.keyDown(table, { key: 'Home' })

		expect(document.activeElement).toBe(rowEls[0])
	})

	it('rings a clickable row with an inset focus ring (clip-safe)', () => {
		renderRoving({ onRowClick: vi.fn() })

		// `focus.inset` (ring-inset), not the outset `focus.ring` the scroll wrapper clips.
		expect(screen.getByText('Alice').closest('tr')?.className).toContain('ring-inset')
	})

	it('activates the focused row on Enter in a double-click-only grid', () => {
		const onRowDoubleClick = vi.fn()

		renderRoving({ onRowDoubleClick })

		const rowEls = bodyRows(screen.getByRole('table'))

		rowEls[1]?.focus()

		fireEvent.keyDown(rowEls[1] as HTMLElement, { key: 'Enter' })

		expect(onRowDoubleClick).toHaveBeenCalledOnce()

		expect(onRowDoubleClick.mock.calls[0]?.[0]).toBe(rows[1])
	})

	it('leaves a Ctrl, Meta, or Alt chord on a roving row to the browser', () => {
		const onRowClick = vi.fn()

		renderRoving({ onRowClick })

		const row = bodyRows(screen.getByRole('table'))[0] as HTMLElement

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

		act(() => item('Alice')?.focus())

		fireEvent.keyDown(screen.getByRole('table'), { key: 'ArrowDown' })

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

		const cells = rovingCells(screen.getByRole('table'))

		// 3 rows x 2 data columns; exactly one resting stop.
		expect(cells).toHaveLength(6)

		expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)
	})

	it('steps a column with Left/Right and a row with Up/Down', () => {
		renderRoving({ onCellClick: vi.fn() })

		const table = screen.getByRole('table')

		const cells = rovingCells(table)

		cells[0]?.focus()

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

		const cells = rovingCells(screen.getByRole('table'))

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

		const table = screen.getByRole('table')

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

		const cells = rovingCells(screen.getByRole('table'))

		expect(cells).toHaveLength(6)

		cells[1]?.focus()

		fireEvent.keyDown(cells[1] as HTMLElement, { key: 'Enter' })

		expect(onCellDoubleClick.mock.calls[0]?.[0]).toMatchObject({ columnId: 'role', rowKey: 1 })

		expect(order).toEqual(['cell', 'row'])
	})

	it('keeps Enter on the click handler when the grid also has a double-click handler', () => {
		const onCellClick = vi.fn()

		const onCellDoubleClick = vi.fn()

		renderRoving({ onCellClick, onCellDoubleClick })

		const cells = rovingCells(screen.getByRole('table'))

		cells[0]?.focus()

		fireEvent.keyDown(cells[0] as HTMLElement, { key: 'Enter' })

		expect(onCellClick).toHaveBeenCalledOnce()

		expect(onCellDoubleClick).not.toHaveBeenCalled()
	})

	it('leaves a Ctrl, Meta, or Alt chord on a roving cell to the browser', () => {
		const onCellClick = vi.fn()

		renderRoving({ onCellClick })

		const cell = rovingCells(screen.getByRole('table'))[0] as HTMLElement

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

		const table = screen.getByRole(roving ? 'table' : 'grid')

		expect(ref.current).toBe(table)

		fireEvent.focus(table)

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(onFocus).toHaveBeenCalledTimes(1)

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})
})
