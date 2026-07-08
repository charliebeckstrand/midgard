import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridCellClickContext, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; role: string }

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

describe('Grid row roving', () => {
	it('seats a single Tab stop across the clickable rows', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={vi.fn()} />)

		// Exactly one resting stop (the first row); the rest are -1.
		expect(bodyRows(screen.getByRole('table')).map((r) => r.tabIndex)).toEqual([0, -1, -1])
	})

	it('moves focus with ArrowDown / ArrowUp, carrying the resting stop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={vi.fn()} />)

		const table = screen.getByRole('table')

		const rowEls = bodyRows(table)

		rowEls[0]?.focus()

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(rowEls[1])

		// The roving hook carries the resting `tabIndex=0` to the focused row.
		expect(rowEls.map((r) => r.tabIndex)).toEqual([-1, 0, -1])

		fireEvent.keyDown(table, { key: 'ArrowUp' })

		expect(document.activeElement).toBe(rowEls[0])
	})

	it('jumps to the last / first row with End / Home', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={vi.fn()} />)

		const table = screen.getByRole('table')

		const rowEls = bodyRows(table)

		rowEls[0]?.focus()

		fireEvent.keyDown(table, { key: 'End' })

		expect(document.activeElement).toBe(rowEls[2])

		fireEvent.keyDown(table, { key: 'Home' })

		expect(document.activeElement).toBe(rowEls[0])
	})

	it('rings a clickable row with an inset focus ring (clip-safe)', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={vi.fn()} />)

		// `focus.inset` (ring-inset), not the outset `focus.ring` the scroll wrapper clips.
		expect(screen.getByText('Alice').closest('tr')?.className).toContain('ring-inset')
	})

	it('does not rove a grid with no click handler', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const rowEls = bodyRows(screen.getByRole('table'))

		expect(rowEls.every((r) => !r.hasAttribute('data-roving'))).toBe(true)

		expect(rowEls.every((r) => r.tabIndex === -1)).toBe(true)
	})
})

describe('Grid cell roving', () => {
	it('makes the data cells a single-tab-stop 2D roving group', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={vi.fn()} />)

		const cells = rovingCells(screen.getByRole('table'))

		// 3 rows x 2 data columns; exactly one resting stop.
		expect(cells).toHaveLength(6)

		expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)
	})

	it('steps a column with Left/Right and a row with Up/Down', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={vi.fn()} />)

		const table = screen.getByRole('table')

		const cells = rovingCells(table)

		cells[0]?.focus()

		fireEvent.keyDown(table, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(cells[1])

		fireEvent.keyDown(table, { key: 'ArrowDown' })

		// cols = 2, so Down from index 1 lands on index 3.
		expect(document.activeElement).toBe(cells[3])
	})

	it('activates the focused cell on Enter — cell click then row click', () => {
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
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				onCellClick={vi.fn()}
				onRowClick={vi.fn()}
			/>,
		)

		const table = screen.getByRole('table')

		// Cell mode: the cells are the roving items, the rows are not.
		expect(rovingCells(table).length).toBe(6)

		expect(bodyRows(table).every((r) => !r.hasAttribute('data-roving'))).toBe(true)
	})

	it('rings a rovable cell with an inset focus ring', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellClick={vi.fn()} />)

		expect(screen.getByText('Alice').closest('td')?.className).toContain('ring-inset')
	})

	it('makes cells rovable for a double-click-only grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onCellDoubleClick={vi.fn()} />)

		expect(rovingCells(screen.getByRole('table'))).toHaveLength(6)
	})

	it('stands down under the navigable cursor (which owns the keyboard)', () => {
		renderUI(<Grid navigable columns={columns} rows={rows} getKey={getKey} onCellClick={vi.fn()} />)

		// The cursor is the single tab stop; no cell marks itself a roving item.
		expect(rovingCells(screen.getByRole('grid'))).toHaveLength(0)
	})
})

describe('Grid grouped-body roving', () => {
	it('roves the data cells of a grouped grid', () => {
		const onCellClick = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				onCellClick={onCellClick}
			/>,
		)

		const table = screen.getByRole('table')

		// Only the expanded leaves' data cells are roving items.
		const cells = rovingCells(table)

		expect(cells.length).toBeGreaterThan(0)

		expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)

		cells[0]?.focus()

		fireEvent.keyDown(cells[0] as HTMLElement, { key: 'Enter' })

		expect(onCellClick).toHaveBeenCalledTimes(1)
	})
})

describe('Grid roving interactive-content deference', () => {
	const withButton: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'action', title: 'Action', cell: (row) => <Button>Edit {row.name}</Button> },
	]

	it('does not activate the cell when Enter lands on inner interactive content', () => {
		const onCellClick = vi.fn()

		renderUI(<Grid columns={withButton} rows={rows} getKey={getKey} onCellClick={onCellClick} />)

		const button = screen.getByRole('button', { name: 'Edit Alice' })

		fireEvent.keyDown(button, { key: 'Enter' })

		expect(onCellClick).not.toHaveBeenCalled()
	})
})
