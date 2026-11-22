import { useState } from 'react'
import { describe, expect, vi } from 'vitest'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import {
	act,
	applyChanges,
	FIRST_WRITE_MS,
	fireEvent,
	getSlot,
	gridCells,
	liveRegion,
	renderUI,
	screen,
} from '../helpers'
import { it } from '../helpers/fake-clock'

type Row = { id: number; name: string; count: number; active: boolean; code: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', count: 1, active: true, code: 'A' },
	{ id: 2, name: 'Bob', count: 2, active: false, code: 'B' },
	{ id: 3, name: 'Carol', count: 3, active: true, code: 'C' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	{ id: 'active', title: 'Active', field: 'active', cell: (row) => (row.active ? 'Yes' : 'No') },
	{ id: 'code', title: 'Code', field: 'code', readOnly: true, cell: (row) => row.code },
]

function renderPasteGrid(
	props: {
		columns?: GridColumn<Row>[]
		editable?: Partial<GridEditableConfig>
		/** Makes `onCommit` return a promise that resolves at once. */
		async?: boolean
	} = {},
) {
	const onCommit = vi.fn()

	const onReject = vi.fn()

	function Harness() {
		const [shown, setShown] = useState(rows)

		return (
			<Grid
				columns={props.columns ?? columns}
				rows={shown}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				range
				editable={{
					session: 'managed',
					scope: 'cell',
					history: true,
					onReject,
					onCommit: (changes) => {
						onCommit(changes)

						setShown((prev) => applyChanges(prev, changes))

						return props.async ? Promise.resolve() : undefined
					},
					...props.editable,
				}}
			/>
		)
	}

	const view = renderUI(<Harness />)

	const grid = screen.getByRole('grid')

	const cell = (row: number, col: number) =>
		gridCells()[row * (props.columns ?? columns).length + col] as HTMLElement

	/** The text of each data cell, row by row. */
	const texts = () =>
		rows.map((_, row) =>
			(props.columns ?? columns).map((_, col) => cell(row, col).textContent ?? ''),
		)

	/** Fires a paste of `text` as the browser does with no editor focused, on the body. */
	const paste = (text: string) =>
		fireEvent.paste(document.body, { clipboardData: { getData: () => text } })

	return { ...view, grid, cell, texts, paste, onCommit, onReject }
}

describe('Grid range paste', () => {
	it('pastes a block from the active cell, one commit batch for each row', async ({ clock }) => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\t10\nBen\t20\n')

		expect(view.onCommit).toHaveBeenCalledTimes(2)

		expect(view.onCommit).toHaveBeenNthCalledWith(1, [
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
			{ rowKey: 1, columnId: 'count', value: 10 },
		])

		expect(view.texts()[1]).toEqual(['Ben', '20', 'No', 'B'])

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('4 cells pasted')
	})

	it('pastes into the cell that the focus seats, at once after the focus', () => {
		const view = renderPasteGrid()

		act(() => view.grid.focus())

		view.paste('Ann')

		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Ann' }])
	})

	it('writes one field into each cell of the range', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 1))

		fireEvent.mouseUp(view.cell(0, 1))

		fireEvent.mouseDown(view.cell(2, 1), { shiftKey: true })

		view.paste('7')

		expect(view.texts().map((row) => row[1])).toEqual(['7', '7', '7'])
	})

	it('tiles a block over a range that is a whole multiple of it', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.mouseDown(view.cell(1, 0), { shiftKey: true })

		view.paste('Xa\nXb\n')

		fireEvent.mouseDown(view.cell(2, 0), { shiftKey: true })

		// Three rows do not hold whole copies of two, so the block keeps its size.
		view.paste('Ya\nYb\n')

		expect(view.texts().map((row) => row[0])).toEqual(['Ya', 'Yb', 'Carol'])
	})

	it('cuts a block off at the last row and the last column', () => {
		const view = renderPasteGrid({ columns: columns.slice(0, 2) })

		fireEvent.mouseDown(view.cell(2, 1))

		view.paste('8\textra\n9\textra')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 3, columnId: 'count', value: 8 },
		])
	})

	it('reads each text as the kind of the cell value', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 1))

		view.paste('$1,200\tno')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: 1200 },
			{ rowKey: 1, columnId: 'active', value: false },
		])
	})

	it('refuses a text that does not fit its cell, and counts it as skipped', async ({ clock }) => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\tmany')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
		])

		expect(view.onReject).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: 'many' },
		])

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('Name pasted for Alice, 1 skipped')
	})

	it('sends a value that validate refuses to onReject, not to onCommit', () => {
		const view = renderPasteGrid({
			columns: columns.map((col) =>
				col.id === 'count'
					? { ...col, validate: (value) => ((value as number) > 99 ? 'Too big' : null) }
					: col,
			),
		})

		fireEvent.mouseDown(view.cell(0, 1))

		view.paste('500\n5')

		expect(view.onReject).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: 500 },
		])

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'count', value: 5 },
		])
	})

	it('skips a read-only column and a column with no field', async ({ clock }) => {
		const view = renderPasteGrid({
			columns: [
				...columns.slice(0, 1),
				{ id: 'label', title: 'Label', cell: (row) => row.name.toUpperCase() },
				...columns.slice(3),
			],
		})

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\tX\tY')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
		])

		expect(view.onReject).not.toHaveBeenCalled()

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('Name pasted for Alice, 2 skipped')
	})

	it('gives the text to the column parse', () => {
		const parse = vi.fn((text: string) => text.length)

		const view = renderPasteGrid({
			columns: columns.map((col) => (col.id === 'count' ? { ...col, parse } : col)),
		})

		fireEvent.mouseDown(view.cell(1, 1))

		view.paste('abcd')

		expect(parse).toHaveBeenCalledExactlyOnceWith('abcd', rows[1])

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'count', value: 4 },
		])
	})

	it('takes off the formula guard that a copy adds', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste("'=1+1")

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: '=1+1' },
		])
	})

	it('undoes the whole paste with one Ctrl+Z', async ({ clock }) => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\nBen')

		fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })

		expect(view.texts().map((row) => row[0])).toEqual(['Alice', 'Bob', 'Carol'])

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('2 cells undone')
	})

	it('speaks an async paste as it settles, and undoes it with one Ctrl+Z', async ({ clock }) => {
		const view = renderPasteGrid({ async: true })

		fireEvent.mouseDown(view.cell(0, 1))

		view.paste('5\t0')

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('2 cells pasted for Alice')

		// The undo commits through the async `onCommit` too, and its promise
		// settles after the key event. An async `act` holds the test until then.
		await act(async () => {
			fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })
		})

		expect(view.onCommit).toHaveBeenLastCalledWith([
			{ rowKey: 1, columnId: 'count', value: 1 },
			{ rowKey: 1, columnId: 'active', value: true },
		])
	})

	it('leaves a paste into an open editor to the editor', () => {
		const view = renderPasteGrid()

		fireEvent.doubleClick(view.cell(0, 0))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		input.focus()

		view.paste('Ann\tBen')

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('pastes nothing without a grid-owned session', () => {
		const view = renderPasteGrid({ editable: { session: 'manual', scope: 'row' } })

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann')

		expect(view.onCommit).not.toHaveBeenCalled()
	})
})

describe('Grid range clear and cut', () => {
	/** Selects the cells of row `row` from column `from` to column `to`, as a drag of the pointer does. */
	function selectRow(
		view: ReturnType<typeof renderPasteGrid>,
		row: number,
		from: number,
		to: number,
	) {
		fireEvent.mouseDown(view.cell(row, from))

		fireEvent.mouseUp(view.cell(row, from))

		fireEvent.mouseDown(view.cell(row, to), { shiftKey: true })
	}

	/** Fires a cut as the browser does with no text selection, on the body, and returns the text that the grid wrote. */
	function cut(): string | undefined {
		const setData = vi.fn()

		fireEvent.cut(document.body, { clipboardData: { setData } })

		return setData.mock.calls[0]?.[1]
	}

	it('clears each cell of the range on Delete, as a paste of empty text', async ({ clock }) => {
		const view = renderPasteGrid()

		selectRow(view, 0, 0, 3)

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		// A text cell takes empty text, and a number cell and a yes/no cell take
		// no value. The read-only column keeps its value.
		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: '' },
			{ rowKey: 1, columnId: 'count', value: undefined },
			{ rowKey: 1, columnId: 'active', value: undefined },
		])

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('3 cells cleared for Alice, 1 skipped')
	})

	it('clears the active cell on Backspace with no range', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(1, 0))

		fireEvent.keyDown(view.grid, { key: 'Backspace' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'name', value: '' },
		])
	})

	it('saves nothing on a second clear of an emptied cell, and keeps its kind', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 1))

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: undefined },
		])

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		// The empty number cell does not take `''`, so no change saves.
		expect(view.onCommit).toHaveBeenCalledOnce()
	})

	it('leaves Delete with a modifier to the browser', () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.keyDown(view.grid, { key: 'Delete', ctrlKey: true })

		fireEvent.keyDown(view.grid, { key: 'Backspace', shiftKey: true })

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('undoes a clear with one Ctrl+Z', () => {
		const view = renderPasteGrid()

		selectRow(view, 0, 0, 1)

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })

		expect(view.texts()[0]).toEqual(['Alice', '1', 'Yes', 'A'])
	})

	it('copies the range on a cut, and then clears it', async ({ clock }) => {
		const view = renderPasteGrid()

		selectRow(view, 0, 0, 1)

		act(() => view.grid.focus())

		expect(cut()).toBe('Alice\t1')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: '' },
			{ rowKey: 1, columnId: 'count', value: undefined },
		])

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('2 cells cut for Alice')
	})

	it('leaves Delete in an open editor to the editor', () => {
		const view = renderPasteGrid()

		fireEvent.doubleClick(view.cell(0, 0))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.keyDown(input, { key: 'Delete' })

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('clears and cuts nothing without a grid-owned session', () => {
		const view = renderPasteGrid({ editable: { session: 'manual', scope: 'row' } })

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		act(() => view.grid.focus())

		cut()

		expect(view.onCommit).not.toHaveBeenCalled()
	})
})

/**
 * A write that no session staged skips a cell whose editor is open, as it
 * skips a cell that holds a draft. The editor reads its value one time, when it
 * opens, so a write to its cell would not reach it: the editor would show the
 * old value, and its next save would write that value back.
 */
describe('Grid range writes over an open editor', () => {
	/**
	 * Opens the editor of a cell, and then moves the cursor away with a click.
	 * The default `commitOn` keeps the editor open, and the click focuses the
	 * table, as a browser does on a press in a cell.
	 */
	function leaveOpen(view: ReturnType<typeof renderPasteGrid>, row: number, col: number) {
		fireEvent.doubleClick(view.cell(row, col))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		const away = view.cell(2, 1)

		fireEvent.mouseDown(away)

		fireEvent.mouseUp(away)

		act(() => view.grid.focus())

		return input
	}

	/** Makes the range from the cell under the cursor to another cell with a Shift+click. */
	function extendTo(view: ReturnType<typeof renderPasteGrid>, row: number, col: number) {
		fireEvent.mouseDown(view.cell(row, col), { shiftKey: true })

		fireEvent.mouseUp(view.cell(row, col))
	}

	it('skips the open cell on a clear, and clears the others', async ({ clock }) => {
		const view = renderPasteGrid()

		const input = leaveOpen(view, 0, 0)

		extendTo(view, 0, 0)

		fireEvent.keyDown(view.grid, { key: 'Delete' })

		expect(input).toBeInTheDocument()

		expect(input).toHaveValue('Alice')

		const written = view.onCommit.mock.calls.flat(2)

		expect(written).not.toContainEqual(expect.objectContaining({ rowKey: 1, columnId: 'name' }))

		expect(written).toContainEqual({ rowKey: 3, columnId: 'name', value: '' })

		await clock.advance(FIRST_WRITE_MS)

		// Five cells of three rows clear, and the open cell is skipped.
		expect(liveRegion()).toHaveTextContent('5 cells cleared, 1 skipped')
	})

	it('skips the open cell on a paste', () => {
		const view = renderPasteGrid()

		const input = leaveOpen(view, 0, 0)

		extendTo(view, 0, 0)

		view.paste('Zed')

		expect(input).toHaveValue('Alice')

		expect(view.onCommit.mock.calls.flat(2)).not.toContainEqual(
			expect.objectContaining({ rowKey: 1, columnId: 'name' }),
		)
	})

	it('skips the open cell on a fill', () => {
		const view = renderPasteGrid()

		const input = leaveOpen(view, 1, 0)

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.mouseUp(view.cell(0, 0))

		extendTo(view, 1, 0)

		fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })

		expect(input).toHaveValue('Bob')

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('does not undo into an open cell', async ({ clock }) => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.mouseUp(view.cell(0, 0))

		view.paste('Zed')

		const input = leaveOpen(view, 0, 0)

		expect(input).toHaveValue('Zed')

		view.onCommit.mockClear()

		fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })

		expect(input).toHaveValue('Zed')

		expect(view.onCommit).not.toHaveBeenCalled()

		await clock.advance(FIRST_WRITE_MS)

		expect(liveRegion()).toHaveTextContent('Cannot undo while a cell has an edit')
	})
})
