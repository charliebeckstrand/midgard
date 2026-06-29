import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
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

// Cells render row-major, so the visible data cells index as:
//   [r0c0, r0c1, r1c0, r1c1, r2c0, r2c1] → indices 0..5.
const NAME = 0

const ROLE = 1

const ROW1_NAME = 2

const ROW1_ROLE = 3

const ROW2_ROLE = 5

describe('Grid navigable cursor', () => {
	it('is a single tab stop with role=grid when navigable', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		expect(grid).toHaveAttribute('tabindex', '0')
	})

	it('gives the role=grid a default accessible name', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		expect(screen.getByRole('grid')).toHaveAccessibleName('Data grid')
	})

	it('lets tableProps name the grid, overriding the default', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				navigable
				tableProps={{ 'aria-label': 'Orders' }}
			/>,
		)

		expect(screen.getByRole('grid')).toHaveAccessibleName('Orders')
	})

	it('marks the data cells as gridcells', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		// 3 rows × 2 data columns.
		expect(screen.getAllByRole('gridcell')).toHaveLength(6)
	})

	it('stays a native table — no cursor — without navigable', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('grid')).not.toBeInTheDocument()

		expect(screen.queryAllByRole('gridcell')).toHaveLength(0)
	})

	it('seats the cursor on a clicked cell', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		fireEvent.mouseDown(cells[ROW1_ROLE] as HTMLElement)

		// `aria-activedescendant` points at the clicked cell's own id.
		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW1_ROLE]?.id)
	})

	it('moves the active cell with the arrow keys', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		fireEvent.mouseDown(cells[NAME] as HTMLElement)

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW1_NAME]?.id)

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW1_ROLE]?.id)
	})

	it('clamps movement at the grid edges', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		fireEvent.mouseDown(cells[NAME] as HTMLElement)

		// Up/Left from the top-left corner stay put.
		fireEvent.keyDown(grid, { key: 'ArrowUp' })

		fireEvent.keyDown(grid, { key: 'ArrowLeft' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[NAME]?.id)
	})

	it('jumps to row edges with Home/End and grid corners with Ctrl', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		fireEvent.mouseDown(cells[ROW1_NAME] as HTMLElement)

		fireEvent.keyDown(grid, { key: 'End' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW1_ROLE]?.id)

		fireEvent.keyDown(grid, { key: 'Home' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW1_NAME]?.id)

		// Ctrl+End → last cell of the last row.
		fireEvent.keyDown(grid, { key: 'End', ctrlKey: true })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROW2_ROLE]?.id)

		// Ctrl+Home → first cell of the first row.
		fireEvent.keyDown(grid, { key: 'Home', ctrlKey: true })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[NAME]?.id)
	})

	it('seeds the cursor at the first cell when a key arrives before focus', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		// No prior cursor; ArrowRight seeds at (0,0) then steps to (0,1).
		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		expect(grid).toHaveAttribute('aria-activedescendant', cells[ROLE]?.id)
	})

	it('reflects the active cell with data-active for styling', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		const cells = screen.getAllByRole('gridcell')

		fireEvent.mouseDown(cells[ROLE] as HTMLElement)

		expect(cells[ROLE]).toHaveAttribute('data-active')

		expect(cells[NAME]).not.toHaveAttribute('data-active')
	})

	it('activates the row under the cursor on Enter', () => {
		const onRowClick = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable onRowClick={onRowClick} />,
		)

		const grid = screen.getByRole('grid')

		const cells = screen.getAllByRole('gridcell')

		// Seat the cursor on the second row (Bob), then activate it.
		fireEvent.mouseDown(cells[ROW1_NAME] as HTMLElement)

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(onRowClick).toHaveBeenCalledTimes(1)

		expect(onRowClick.mock.calls[0]?.[0]).toEqual(rows[1])
	})

	it('defers a click on focusable cell content to that content', () => {
		const onRowClick = vi.fn()

		const withButton: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{
				id: 'action',
				title: 'Action',
				cell: (row) => <button type="button">Edit {row.name}</button>,
			},
		]

		renderUI(
			<Grid columns={withButton} rows={rows} getKey={getKey} navigable onRowClick={onRowClick} />,
		)

		const grid = screen.getByRole('grid')

		// Pressing the in-cell button must not seat the cursor away from it.
		fireEvent.mouseDown(screen.getByRole('button', { name: 'Edit Alice' }))

		expect(grid).not.toHaveAttribute('aria-activedescendant')
	})
})

describe('Grid navigable role', () => {
	it('is role=grid even for a plain, whole-set grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} navigable />)

		// A cursor backs role="grid" without any windowing.
		expect(screen.getByRole('grid')).toBeInTheDocument()
	})
})

describe('Grid cursor selection', () => {
	const selectColumns: GridColumn<Row>[] = [{ id: 'select', selectable: true }, ...columns]

	it('toggles the active row selection with Space, never scrolling', () => {
		renderUI(<Grid columns={selectColumns} rows={rows} getKey={getKey} navigable />)

		const grid = screen.getByRole('grid')

		// Seed at the first row, then move the cursor to Bob (row index 1).
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		// fireEvent returns false when a handler calls preventDefault — Space must,
		// so it never scrolls the grid's own tab stop.
		const scrolled = fireEvent.keyDown(grid, { key: ' ' })

		expect(scrolled).toBe(false)

		// It toggled the active row's selection (APG grid pattern).
		expect(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeChecked()
	})

	it('selects, rather than activates, on Space when the grid is also clickable', () => {
		const onRowClick = vi.fn()

		renderUI(
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={getKey}
				navigable
				onRowClick={onRowClick}
			/>,
		)

		const grid = screen.getByRole('grid')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: ' ' })

		// Space selects; Enter is what activates.
		expect(onRowClick).not.toHaveBeenCalled()

		expect(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeChecked()

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(onRowClick).toHaveBeenCalledTimes(1)
	})

	it('still activates a clickable row on Space when there is no selection column', () => {
		const onRowClick = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable onRowClick={onRowClick} />,
		)

		const grid = screen.getByRole('grid')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: ' ' })

		expect(onRowClick).toHaveBeenCalledTimes(1)
	})
})
