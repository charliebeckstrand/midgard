import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellChange,
	type GridColumn,
	type GridEditableConfig,
} from '../../modules/grid'
import {
	act,
	expectAnnouncement,
	fireEvent,
	getSlot,
	gridCells,
	renderUI,
	screen,
} from '../helpers'

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

/** Writes each change into a copy of its row. */
function applyChanges(current: Row[], changes: GridCellChange[]): Row[] {
	return current.map((row) => {
		const mine = changes.filter((change) => change.rowKey === row.id)

		if (mine.length === 0) return row

		return Object.assign(
			{ ...row },
			Object.fromEntries(mine.map((change) => [change.columnId, change.value])),
		)
	})
}

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
	it('pastes a block from the active cell, one commit batch for each row', async () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\t10\nBen\t20\n')

		expect(view.onCommit).toHaveBeenCalledTimes(2)

		expect(view.onCommit).toHaveBeenNthCalledWith(1, [
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
			{ rowKey: 1, columnId: 'count', value: 10 },
		])

		expect(view.texts()[1]).toEqual(['Ben', '20', 'No', 'B'])

		await expectAnnouncement('4 cells pasted')
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

	it('refuses a text that does not fit its cell, and counts it as skipped', async () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\tmany')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
		])

		expect(view.onReject).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: 'many' },
		])

		await expectAnnouncement('Name pasted for Alice, 1 skipped')
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

	it('skips a read-only column and a column with no field', async () => {
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

		await expectAnnouncement('Name pasted for Alice, 2 skipped')
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

	it('undoes the whole paste with one Ctrl+Z', async () => {
		const view = renderPasteGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		view.paste('Ann\nBen')

		fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })

		expect(view.texts().map((row) => row[0])).toEqual(['Alice', 'Bob', 'Carol'])

		await expectAnnouncement('2 cells undone')
	})

	it('speaks an async paste as it settles, and undoes it with one Ctrl+Z', async () => {
		const view = renderPasteGrid({ async: true })

		fireEvent.mouseDown(view.cell(0, 1))

		view.paste('5\t0')

		await expectAnnouncement('2 cells pasted for Alice')

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
