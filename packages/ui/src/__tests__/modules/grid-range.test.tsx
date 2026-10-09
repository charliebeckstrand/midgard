import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, expectAnnouncement, fireEvent, gridCells, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; role: string; note: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{ id: 'note', title: 'Note', cell: (row) => row.note },
]

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Admin', note: '=1+1' },
	{ id: 2, name: 'Bob', role: 'User', note: 'two\tparts' },
	{ id: 3, name: 'Carol', role: 'User', note: 'plain' },
]

const getKey = (row: Row) => row.id

/** The data cell at a row and a column, in row-major order. */
function cell(row: number, col: number): HTMLElement {
	return gridCells()[row * columns.length + col] as HTMLElement
}

/** The `[row, col]` of each cell that carries `data-in-range`. */
function inRange(): [number, number][] {
	return gridCells().flatMap((node, index) =>
		node.hasAttribute('data-in-range')
			? [[Math.floor(index / columns.length), index % columns.length] as [number, number]]
			: [],
	)
}

/**
 * Fires a copy as the browser does with no text selection, on the body, and
 * returns the text that the grid wrote, if any.
 */
function copy(): string | undefined {
	const setData = vi.fn()

	fireEvent.copy(document.body, { clipboardData: { setData } })

	return setData.mock.calls[0]?.[1]
}

function renderRangeGrid(props: { range?: boolean; rows?: Row[] } = {}) {
	const { range = true, rows: shown = rows } = props

	const view = renderUI(
		<Grid columns={columns} rows={shown} getKey={getKey} navigable range={range} />,
	)

	const grid = screen.getByRole('grid')

	const rerender = (next: Row[]) =>
		view.rerender(<Grid columns={columns} rows={next} getKey={getKey} navigable range={range} />)

	return { grid, rerender }
}

describe('Grid range', () => {
	it('extends a range with Shift and an arrow key', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])

		// The cursor is the far corner of the range.
		expect(grid).toHaveAttribute('aria-activedescendant', cell(1, 1).id)
	})

	it('ends the range on a move without Shift', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		expect(inRange()).toEqual([])
	})

	it('extends to a grid corner with Shift and Ctrl+End', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(1, 1))

		fireEvent.keyDown(grid, { key: 'End', shiftKey: true, ctrlKey: true })

		expect(inRange()).toEqual([
			[1, 1],
			[1, 2],
			[2, 1],
			[2, 2],
		])
	})

	it('extends a range with Shift and a click', () => {
		renderRangeGrid()

		fireEvent.mouseDown(cell(0, 1))

		fireEvent.mouseDown(cell(2, 2), { shiftKey: true })

		expect(inRange()).toEqual([
			[0, 1],
			[0, 2],
			[1, 1],
			[1, 2],
			[2, 1],
			[2, 2],
		])
	})

	it('owns the press on a cell, so the browser starts no text selection', () => {
		renderRangeGrid()

		expect(fireEvent.mouseDown(cell(0, 0))).toBe(false)
	})

	it('ends the range on the first Escape, and clears the cursor on the next', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'Escape' })

		expect(inRange()).toEqual([])

		expect(grid).toHaveAttribute('aria-activedescendant', cell(1, 0).id)

		fireEvent.keyDown(grid, { key: 'Escape' })

		expect(grid).not.toHaveAttribute('aria-activedescendant')
	})

	it('ends the range when the rows change order, and keeps it for new rows in the same order', () => {
		const { grid, rerender } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		// A save gives new row objects in the same order.
		rerender(rows.map((row) => ({ ...row })))

		expect(inRange()).toEqual([
			[0, 0],
			[1, 0],
		])

		rerender([...rows].reverse())

		expect(inRange()).toEqual([])
	})

	it('holds no range without the prop', () => {
		const { grid } = renderRangeGrid({ range: false })

		expect(fireEvent.mouseDown(cell(0, 0))).toBe(true)

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(inRange()).toEqual([])

		expect(copy()).toBeUndefined()
	})

	it('copies the range as TSV, with the quotes and the formula guard', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 1))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		expect(copy()).toBe('Admin\t\'=1+1\nUser\t"two\tparts"')
	})

	it('copies the active cell with no range', () => {
		renderRangeGrid()

		fireEvent.mouseDown(cell(2, 0))

		expect(copy()).toBe('Carol')
	})

	it('copies the cell that the focus seats, at once after the focus', () => {
		const { grid } = renderRangeGrid()

		act(() => grid.focus())

		expect(copy()).toBe('Alice')
	})

	it('leaves a copy of selected text to the browser', () => {
		renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		const selection = document.getSelection()

		selection?.selectAllChildren(cell(1, 0))

		onTestFinished(() => selection?.removeAllRanges())

		expect(copy()).toBeUndefined()
	})

	it('leaves a copy to the browser while the grid does not have focus', () => {
		renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		screen.getByRole('grid').blur()

		expect(copy()).toBeUndefined()
	})

	it('speaks the size and the corners of the range once it stops changing', async () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		await expectAnnouncement('Range of 3 rows and 2 columns, Name row 1 to Role row 3')
	})
})

describe('Grid range over grouped rows', () => {
	type Sale = { id: number; region: string; units: number }

	const sales: Sale[] = [
		{ id: 1, region: 'West', units: 10 },
		{ id: 2, region: 'West', units: 30 },
		{ id: 3, region: 'East', units: 20 },
	]

	const saleColumns: GridColumn<Sale>[] = [
		{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
		{ id: 'units', title: 'Units', cell: (row) => `${row.units} units`, value: (row) => row.units },
	]

	it('steps over a group header inside the range', () => {
		renderUI(
			<Grid
				columns={saleColumns}
				rows={sales}
				getKey={(row) => row.id}
				groupBy={{ value: 'region' }}
				navigable
				range
			/>,
		)

		const grid = screen.getByRole('treegrid')

		const unitsCell = (text: string) => screen.getByText(text).closest('td') as HTMLElement

		fireEvent.mouseDown(unitsCell('10 units'))

		fireEvent.mouseDown(unitsCell('20 units'), { shiftKey: true })

		const marked = [...grid.querySelectorAll('td[data-in-range]')].map((node) => node.textContent)

		expect(marked).toEqual(['10 units', '30 units', '20 units'])

		expect(copy()).toBe('10\n30\n20')
	})
})

describe('Grid range in an editable grid', () => {
	it('extends a range with Shift and a click, as a read-only grid does', () => {
		renderUI(
			<Grid
				columns={columns.map((col) => ({ ...col, field: col.id as keyof Row }))}
				rows={rows}
				getKey={getKey}
				editable={{ session: 'managed', onCommit: () => {} }}
				range
			/>,
		)

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.mouseDown(cell(1, 1), { shiftKey: true })

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])
	})
})
