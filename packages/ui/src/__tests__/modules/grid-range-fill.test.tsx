import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellChange,
	type GridColumn,
	type GridEditableConfig,
} from '../../modules/grid'
import { expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; count: number; code: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', count: 1, code: 'A' },
	{ id: 2, name: 'Bob', count: 2, code: 'B' },
	{ id: 3, name: 'Carol', count: 3, code: 'C' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
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

function renderFillGrid(props: { editable?: Partial<GridEditableConfig> } = {}) {
	const onCommit = vi.fn()

	function Harness() {
		const [shown, setShown] = useState(rows)

		return (
			<Grid
				columns={columns}
				rows={shown}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				range
				contextMenu={{ cell: true }}
				editable={{
					session: 'managed',
					scope: 'cell',
					history: true,
					onCommit: (changes) => {
						onCommit(changes)

						setShown((prev) => applyChanges(prev, changes))
					},
					...props.editable,
				}}
			/>
		)
	}

	const view = renderUI(<Harness />)

	const grid = screen.getByRole('grid')

	const cell = (row: number, col: number) =>
		screen.getAllByRole('gridcell')[row * columns.length + col] as HTMLElement

	/** The text of each data cell, row by row. */
	const texts = () => rows.map((_, row) => columns.map((_, col) => cell(row, col).textContent))

	/** Makes the range from one cell to another. */
	const select = (from: [number, number], to: [number, number]) => {
		fireEvent.mouseDown(cell(...from))

		fireEvent.mouseDown(cell(...to), { shiftKey: true })
	}

	return { ...view, grid, cell, texts, select, onCommit }
}

describe('Grid range fill', () => {
	it('fills down from the top row with Ctrl+D, as one save', async () => {
		const view = renderFillGrid()

		view.select([0, 0], [2, 1])

		const event = fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })

		expect(event).toBe(false)

		expect(view.texts()).toEqual([
			['Alice', '1', 'A'],
			['Alice', '1', 'B'],
			['Alice', '1', 'C'],
		])

		expect(view.onCommit).toHaveBeenCalledTimes(2)

		await expectAnnouncement('4 cells filled')

		fireEvent.keyDown(view.grid, { key: 'z', ctrlKey: true })

		expect(view.texts().map((row) => row[0])).toEqual(['Alice', 'Bob', 'Carol'])
	})

	it('fills right from the first column with Cmd+R, and skips a read-only cell', async () => {
		const view = renderFillGrid()

		view.select([1, 0], [1, 2])

		fireEvent.keyDown(view.grid, { key: 'r', metaKey: true })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 2, columnId: 'count', value: 'Bob' },
		])

		await expectAnnouncement('Count filled for Bob, 1 skipped')
	})

	it('leaves the key to the browser when the range is one cell deep', () => {
		const view = renderFillGrid()

		view.select([0, 0], [0, 1])

		expect(fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })).toBe(true)

		fireEvent.mouseDown(view.cell(0, 0))

		expect(fireEvent.keyDown(view.grid, { key: 'r', ctrlKey: true })).toBe(true)

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('fills nothing without a grid-owned session', () => {
		const view = renderFillGrid({ editable: { session: 'manual' } })

		view.select([0, 0], [2, 0])

		expect(fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })).toBe(true)

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('offers Fill down and Fill right in the cell menu, and keeps the range on a right-click', () => {
		const view = renderFillGrid()

		view.select([0, 0], [2, 1])

		fireEvent.mouseDown(view.cell(1, 1), { button: 2 })

		fireEvent.contextMenu(view.cell(1, 1))

		expect(screen.getByRole('menuitem', { name: 'Fill right' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fill down' }))

		expect(view.texts().map((row) => row[1])).toEqual(['1', '1', '1'])
	})

	it('offers no fill item for a range of one cell', () => {
		const view = renderFillGrid()

		fireEvent.mouseDown(view.cell(0, 0))

		fireEvent.contextMenu(view.cell(0, 0))

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Fill down' })).not.toBeInTheDocument()
	})
})
