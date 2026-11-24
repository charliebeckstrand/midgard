import { useState } from 'react'
import { describe, expect, onTestFinished, vi } from 'vitest'
import { Grid, type GridColumn, type GridRangeState } from '../../modules/grid'
import { GRID_RANGE_ANNOUNCE_MS } from '../../modules/grid/engine/grid-constants'
import { act, FIRST_WRITE_MS, fireEvent, gridCells, liveRegion, renderUI, screen } from '../helpers'
import { type FakeClock, it } from '../helpers/fake-clock'

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

/**
 * Fires a copy as {@link copy} does, and returns the text that the grid wrote
 * for each type.
 */
function copyTypes(): Record<string, string> {
	const setData = vi.fn()

	fireEvent.copy(document.body, { clipboardData: { setData } })

	return Object.fromEntries(setData.mock.calls as [string, string][])
}

/**
 * Moves the clock past the settle window of the range, and then past the first
 * write of the announcer (`FIRST_WRITE_MS`).
 */
async function settleAnnouncement(clock: FakeClock): Promise<void> {
	await clock.advance(GRID_RANGE_ANNOUNCE_MS)

	await clock.advance(FIRST_WRITE_MS)
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

	it('selects each data cell with Ctrl+A or Cmd+A, and speaks the range', async ({ clock }) => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(1, 1))

		const press = fireEvent.keyDown(grid, { key: 'a', ctrlKey: true })

		// The grid takes the key, so the browser selects no text of the page.
		expect(press).toBe(false)

		expect(inRange()).toHaveLength(rows.length * columns.length)

		// The cursor is the last cell, the far corner from the first cell.
		expect(grid).toHaveAttribute('aria-activedescendant', cell(2, 2).id)

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'A', metaKey: true })

		expect(inRange()).toHaveLength(rows.length * columns.length)

		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent(
			'Range of 3 rows and 3 columns, Name row 2 to Note row 4',
		)
	})

	it('reads Ctrl+A from the physical key on a layout with no Latin letters', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		expect(fireEvent.keyDown(grid, { key: 'ф', code: 'KeyA', ctrlKey: true })).toBe(false)

		expect(inRange()).toHaveLength(rows.length * columns.length)
	})

	it('leaves a Ctrl+A that composes text to the input method', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		expect(fireEvent.keyDown(grid, { key: 'a', ctrlKey: true, keyCode: 229 })).toBe(true)

		expect(inRange()).toEqual([])
	})

	it('leaves Ctrl+A to the browser without the range', () => {
		const { grid } = renderRangeGrid({ range: false })

		fireEvent.mouseDown(cell(0, 0))

		expect(fireEvent.keyDown(grid, { key: 'a', ctrlKey: true })).toBe(true)
	})

	it('leaves Ctrl+A with another modifier to the browser', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		expect(fireEvent.keyDown(grid, { key: 'a', ctrlKey: true, shiftKey: true })).toBe(true)

		expect(inRange()).toEqual([])
	})

	// APG grid: Ctrl+Space selects the column. The key toggled the row, as
	// Space does.
	it('selects the column of the cursor with Ctrl+Space', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(1, 1))

		expect(fireEvent.keyDown(grid, { key: ' ', ctrlKey: true })).toBe(false)

		expect(inRange()).toEqual([
			[0, 1],
			[1, 1],
			[2, 1],
		])

		expect(grid).toHaveAttribute('aria-activedescendant', cell(2, 1).id)
	})

	it('leaves Ctrl+Space to the row without the range', () => {
		renderUI(
			<Grid
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={getKey}
				navigable
			/>,
		)

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(screen.getByRole('grid'), { key: ' ', ctrlKey: true })

		expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeChecked()
	})

	it('extends a range with Shift and a click', () => {
		renderRangeGrid()

		fireEvent.mouseDown(cell(0, 1))

		fireEvent.mouseUp(cell(0, 1))

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

	// While a pen drags, the tap of a palm sends a primary press too. A press without a
	// release in between is that tap: it does not seat the cursor or cut the drag.
	it('keeps the cursor on the cell of a drag when a palm presses another cell', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.mouseDown(cell(2, 1))

		expect(grid).toHaveAttribute('aria-activedescendant', cell(0, 0).id)

		fireEvent.mouseUp(cell(0, 0))

		fireEvent.mouseDown(cell(2, 1))

		expect(grid).toHaveAttribute('aria-activedescendant', cell(2, 1).id)
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

	it('copies the range as an HTML table too, for a paste into a document', () => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 1))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		const types = copyTypes()

		expect(Object.keys(types)).toEqual(['text/plain', 'text/html'])

		const td = '<td style="white-space:pre-wrap">'

		expect(types['text/html']).toBe(
			`<table><tbody><tr>${td}Admin</td>${td}'=1+1</td></tr>` +
				`<tr>${td}User</td>${td}two\tparts</td></tr></tbody></table>`,
		)
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

		act(() => screen.getByRole('grid').blur())

		expect(copy()).toBeUndefined()
	})

	it('speaks the size and the corners of the range once it stops changing', async ({ clock }) => {
		const { grid } = renderRangeGrid()

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		// The header is row 1, so the rows count as a screen reader counts them.
		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent(
			'Range of 3 rows and 2 columns, Name row 2 to Role row 4',
		)
	})

	it('speaks the row numbers of the page in the full set', async ({ clock }) => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				navigable
				range
				pagination={{ defaultValue: { pageIndex: 1, pageSize: 2 } }}
			/>,
		)

		const grid = screen.getByRole('grid')

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		expect(cell(0, 0).closest('tr')).toHaveAttribute('aria-rowindex', '4')

		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent('Range of 1 row and 2 columns, Name row 4 to Role row 4')
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

		fireEvent.mouseUp(unitsCell('10 units'))

		fireEvent.mouseDown(unitsCell('20 units'), { shiftKey: true })

		const marked = [...grid.querySelectorAll('td[data-in-range]')].map((node) => node.textContent)

		expect(marked).toEqual(['10 units', '30 units', '20 units'])

		expect(copy()).toBe('10\n30\n20')
	})

	it('selects each data cell of each group with Ctrl+A, and no group header', () => {
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

		fireEvent.mouseDown(screen.getByText('30 units'))

		fireEvent.keyDown(grid, { key: 'a', ctrlKey: true })

		const marked = [...grid.querySelectorAll('td[data-in-range]')].map((node) => node.textContent)

		expect(marked).toEqual(['West', '10 units', 'West', '30 units', 'East', '20 units'])
	})

	it('speaks the row numbers with the group headers counted', async ({ clock }) => {
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

		const unitsCell = (text: string) => screen.getByText(text).closest('td') as HTMLElement

		fireEvent.mouseDown(unitsCell('10 units'))

		fireEvent.mouseUp(unitsCell('10 units'))

		fireEvent.mouseDown(unitsCell('20 units'), { shiftKey: true })

		const rowIndex = (text: string) => unitsCell(text).closest('tr')?.getAttribute('aria-rowindex')

		expect([rowIndex('10 units'), rowIndex('20 units')]).toEqual(['3', '6'])

		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent(
			'Range of 3 rows and 1 column, Units row 3 to Units row 6',
		)
	})

	it('copies and speaks the range while its focus is on a group header', async ({ clock }) => {
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

		fireEvent.mouseDown(screen.getByText('10 units'))

		fireEvent.mouseUp(screen.getByText('10 units'))

		// The second step lands on the header of the East group.
		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(copy()).toBe('10\n30')

		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent(
			'Range of 2 rows and 1 column, Units row 3 to Units row 4',
		)
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

		fireEvent.mouseUp(cell(0, 0))

		fireEvent.mouseDown(cell(1, 1), { shiftKey: true })

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])
	})
})

describe('Grid range binding', () => {
	const at = (rowKey: number, columnId: string) => ({ rowKey, columnId })

	/** A grid whose owner holds the range, and takes each change unless `refuse` is set. */
	function Owner({
		initial,
		refuse = false,
		shown = rows,
		onValueChange,
	}: {
		initial: GridRangeState | null
		refuse?: boolean
		shown?: Row[]
		onValueChange?: (range: GridRangeState | null) => void
	}) {
		const [value, setValue] = useState(initial)

		return (
			<>
				<button
					type="button"
					onClick={() => setValue({ anchor: at(3, 'role'), focus: at(2, 'note') })}
				>
					Set
				</button>
				<button type="button" onClick={() => setValue(null)}>
					Clear
				</button>
				<Grid
					columns={columns}
					rows={shown}
					getKey={getKey}
					navigable
					range={{
						value,
						onValueChange: (next) => {
							onValueChange?.(next)

							if (!refuse) setValue(next)
						},
					}}
				/>
			</>
		)
	}

	it('reports each change by the row key and the column id, and nothing at mount', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} navigable range={{ onValueChange }} />,
		)

		const grid = screen.getByRole('grid')

		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.mouseDown(cell(0, 0))

		// A cursor move with no range changes no range.
		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(onValueChange).toHaveBeenLastCalledWith({ anchor: at(1, 'name'), focus: at(2, 'name') })

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		expect(onValueChange).toHaveBeenLastCalledWith({ anchor: at(1, 'name'), focus: at(2, 'role') })

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(onValueChange).toHaveBeenLastCalledWith(null)

		expect(onValueChange).toHaveBeenCalledTimes(3)
	})

	it('seeds the range from `defaultValue`, with the cursor on the focus cell', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				navigable
				range={{ defaultValue: { anchor: at(2, 'role'), focus: at(3, 'note') }, onValueChange }}
			/>,
		)

		expect(inRange()).toEqual([
			[1, 1],
			[1, 2],
			[2, 1],
			[2, 2],
		])

		expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', cell(2, 2).id)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('shows a controlled value, moves to a new value, and clears to no range', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Owner
				initial={{ anchor: at(1, 'name'), focus: at(2, 'role') }}
				onValueChange={onValueChange}
			/>,
		)

		const grid = screen.getByRole('grid')

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])

		fireEvent.click(screen.getByRole('button', { name: 'Set' }))

		// The anchor is on the third row and the focus on the second.
		expect(inRange()).toEqual([
			[1, 1],
			[1, 2],
			[2, 1],
			[2, 2],
		])

		expect(grid).toHaveAttribute('aria-activedescendant', cell(1, 2).id)

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

		expect(inRange()).toEqual([])

		// The cursor stays where the range left it.
		expect(grid).toHaveAttribute('aria-activedescendant', cell(1, 2).id)

		// A value from the owner is not a change to report.
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('keeps the controlled value when the owner does not take a change', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Owner
				initial={{ anchor: at(1, 'name'), focus: at(1, 'role') }}
				refuse
				onValueChange={onValueChange}
			/>,
		)

		fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown', shiftKey: true })

		expect(onValueChange).toHaveBeenCalledWith({ anchor: at(1, 'name'), focus: at(2, 'role') })

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
		])
	})

	it('reports the end of the range on a new order, and an owner that keeps its value keeps the cells', () => {
		const onValueChange = vi.fn()

		const range = { anchor: at(1, 'name'), focus: at(2, 'name') }

		const { rerender } = renderUI(<Owner initial={range} refuse onValueChange={onValueChange} />)

		rerender(
			<Owner
				initial={range}
				refuse
				shown={[rows[2], rows[1], rows[0]] as Row[]}
				onValueChange={onValueChange}
			/>,
		)

		expect(onValueChange).toHaveBeenLastCalledWith(null)

		// Bob and Alice are now the second and the third rows.
		expect(inRange()).toEqual([
			[1, 0],
			[2, 0],
		])
	})

	it('shows a value that comes with a new order on the cells of that order', () => {
		const onValueChange = vi.fn()

		const grid = (shown: Row[], value: GridRangeState) => (
			<Grid
				columns={columns}
				rows={shown}
				getKey={getKey}
				navigable
				range={{ value, onValueChange }}
			/>
		)

		const { rerender } = renderUI(grid(rows, { anchor: at(1, 'name'), focus: at(1, 'name') }))

		rerender(
			grid([rows[2], rows[1], rows[0]] as Row[], { anchor: at(3, 'role'), focus: at(2, 'note') }),
		)

		// Carol and Bob are the first and the second rows of the new order.
		expect(inRange()).toEqual([
			[0, 1],
			[0, 2],
			[1, 1],
			[1, 2],
		])

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('shows a value whose rows load after it, and when a filter shows its row again', () => {
		const onValueChange = vi.fn()

		const value = { anchor: at(1, 'name'), focus: at(2, 'role') }

		const grid = (shown: Row[]) => (
			<Grid
				columns={columns}
				rows={shown}
				getKey={getKey}
				navigable
				range={{ value, onValueChange }}
			/>
		)

		const { rerender } = renderUI(grid([]))

		rerender(grid(rows))

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])

		// A filter hides Bob, and the range names a cell that the grid does not show.
		rerender(grid([rows[0], rows[2]] as Row[]))

		rerender(grid(rows))

		expect(inRange()).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		])
	})

	it('shows a value again when the group of its rows opens again', () => {
		type Sale = { id: number; region: string; units: number }

		const sales: Sale[] = [
			{ id: 1, region: 'West', units: 10 },
			{ id: 2, region: 'West', units: 30 },
			{ id: 3, region: 'East', units: 20 },
		]

		renderUI(
			<Grid
				columns={[
					{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
					{ id: 'units', title: 'Units', cell: (row) => `${row.units} units` },
				]}
				rows={sales}
				getKey={(row) => row.id}
				groupBy={{ value: 'region' }}
				navigable
				range={{ value: { anchor: at(1, 'units'), focus: at(2, 'units') }, onValueChange: vi.fn() }}
			/>,
		)

		const marked = () =>
			gridCells()
				.filter((node) => node.hasAttribute('data-in-range'))
				.map((node) => node.textContent)

		expect(marked()).toEqual(['10 units', '30 units'])

		// The closed group hides the rows of the value, so the grid shows no range.
		fireEvent.click(screen.getByRole('button', { name: /^West/, expanded: true }))

		expect(marked()).toEqual([])

		// The rows and the columns are the same, and only the order of the cursor changes.
		fireEvent.click(screen.getByRole('button', { name: /^West/, expanded: false }))

		expect(marked()).toEqual(['10 units', '30 units'])
	})

	it('shows no range for a value that names a row the grid does not show', () => {
		renderUI(<Owner initial={{ anchor: at(1, 'name'), focus: at(9, 'name') }} />)

		expect(inRange()).toEqual([])
	})

	it('gives the data row at the edge as the focus while the cursor is on a group header', () => {
		type Sale = { id: number; region: string; units: number }

		const sales: Sale[] = [
			{ id: 1, region: 'West', units: 10 },
			{ id: 2, region: 'West', units: 30 },
			{ id: 3, region: 'East', units: 20 },
		]

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={[
					{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
					{ id: 'units', title: 'Units', cell: (row) => `${row.units} units` },
				]}
				rows={sales}
				getKey={(row) => row.id}
				groupBy={{ value: 'region' }}
				navigable
				range={{ onValueChange }}
			/>,
		)

		const grid = screen.getByRole('treegrid')

		fireEvent.mouseDown(screen.getByText('10 units'))

		fireEvent.mouseUp(screen.getByText('10 units'))

		// The second step lands on the header of the East group.
		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(onValueChange).toHaveBeenLastCalledWith({
			anchor: at(1, 'units'),
			focus: at(2, 'units'),
		})
	})

	it('reports a range of an editable grid', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns.map((col) => ({ ...col, field: col.id as keyof Row }))}
				rows={rows}
				getKey={getKey}
				editable={{ session: 'managed', onCommit: () => {} }}
				range={{ onValueChange }}
			/>,
		)

		fireEvent.mouseDown(cell(0, 0))

		fireEvent.mouseUp(cell(0, 0))

		fireEvent.mouseDown(cell(1, 1), { shiftKey: true })

		expect(onValueChange).toHaveBeenLastCalledWith({ anchor: at(1, 'name'), focus: at(2, 'role') })
	})
})

describe('Grid range figures', () => {
	type Sale = { id: number; item: string; units: number; price: string }

	const sales: Sale[] = [
		{ id: 1, item: 'Pens', units: 10, price: '$1.50' },
		{ id: 2, item: 'Paper', units: 30, price: '$4.25' },
		{ id: 3, item: 'Ink', units: 20, price: '$12.00' },
	]

	const saleColumns: GridColumn<Sale>[] = [
		{ id: 'item', title: 'Item', cell: (row) => row.item },
		{ id: 'units', title: 'Units', cell: (row) => String(row.units) },
		{ id: 'price', title: 'Price', cell: (row) => row.price },
	]

	const saleCell = (row: number, col: number) =>
		gridCells()[row * saleColumns.length + col] as HTMLElement

	/** The text of each figure in the footer. */
	const figures = () =>
		[...document.querySelectorAll('[data-slot="grid-footer-figure"]')].map(
			(node) => node.textContent,
		)

	function renderSales(rangeFigures: boolean | ('count' | 'sum' | 'avg' | 'min' | 'max')[] = true) {
		renderUI(
			<Grid
				columns={saleColumns}
				rows={sales}
				getKey={(row) => row.id}
				navigable
				range
				footer={{ rangeFigures }}
			/>,
		)

		return screen.getByRole('grid')
	}

	it('shows the count, the sum, and the average of a range of numbers', () => {
		const grid = renderSales()

		fireEvent.mouseDown(saleCell(0, 1))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(figures()).toEqual(['Count 2', 'Sum 40', 'Average 20'])

		fireEvent.keyDown(grid, { key: 'ArrowRight', shiftKey: true })

		// The prices read as numbers, as the aggregates read them.
		expect(figures()).toEqual(['Count 4', 'Sum 45.75', 'Average 11.44'])
	})

	it('shows the count alone for a range of text, and nothing for one cell', () => {
		const grid = renderSales()

		fireEvent.mouseDown(saleCell(0, 0))

		expect(figures()).toEqual([])

		expect(document.querySelector('[data-slot="grid-footer"]')).toBeNull()

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(figures()).toEqual(['Count 2'])

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(figures()).toEqual([])
	})

	it('shows the figures of a list in its order', () => {
		const grid = renderSales(['max', 'min'])

		fireEvent.mouseDown(saleCell(0, 1))

		fireEvent.keyDown(grid, { key: 'End', ctrlKey: true, shiftKey: true })

		expect(figures()).toEqual(['Maximum 30', 'Minimum 1.5'])
	})

	it('shows a figure that the list names twice one time', () => {
		const grid = renderSales(['sum', 'count', 'sum'])

		fireEvent.mouseDown(saleCell(0, 1))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		expect(figures()).toEqual(['Sum 40', 'Count 2'])
	})

	it('speaks the figures with the range once it stops changing', async ({ clock }) => {
		const grid = renderSales()

		fireEvent.mouseDown(saleCell(0, 1))

		fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })

		await settleAnnouncement(clock)

		expect(liveRegion()).toHaveTextContent(
			'Range of 2 rows and 1 column, Units row 2 to Units row 3. Count 2, Sum 40, Average 20',
		)
	})
})
