import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import {
	coercePastedValue,
	parseTsv,
	serializeTsv,
} from '../../modules/grid/engine/grid-editing-utilities'
import { fireEvent, renderUI } from '../helpers'

/**
 * The cursor's anchored rectangular range (see
 * docs/2026-07-13-GRID-RANGE-PLAN.md): Shift+movement stretches it, unshifted
 * moves collapse it, and copy / paste / fill ride the one commit sink — a
 * pasted TSV block and a fill land as single validated `CellChange[]` batches.
 */
describe('Grid range selection', () => {
	type Row = { id: number; name: string; count: number }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2 },
		{ id: 2, name: 'Bob', count: 5 },
		{ id: 3, name: 'Cara', count: 8 },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function renderRangeGrid(args?: { editable?: boolean; cols?: GridColumn<Row>[] }) {
		const onValueChange = vi.fn()

		const view = renderUI(
			<Grid
				columns={args?.cols ?? columns}
				rows={baseRows}
				getKey={(row) => row.id}
				navigable
				editable={
					args?.editable ? { trigger: 'doubleClick', scope: 'cell', onValueChange } : undefined
				}
			/>,
		)

		const grid = view.getByRole('grid')

		return {
			...view,
			grid,
			onValueChange,
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
			rangeCells: () => view.container.querySelectorAll('td[data-range]').length,
		}
	}

	function seedCursor(grid: HTMLElement) {
		fireEvent.focus(grid)
	}

	it('stretches an anchored range with Shift+arrows and marks its cells', () => {
		const view = renderRangeGrid()

		seedCursor(view.grid)

		// Anchor at (0,0); stretch to (1,1): a 2×2 rect.
		fireEvent.keyDown(view.grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(view.grid, { key: 'ArrowRight', shiftKey: true })

		expect(view.rangeCells()).toBe(4)

		// Range cells advertise their selection to AT.
		expect(view.cell('name', 0)).toHaveAttribute('aria-selected', 'true')

		expect(view.cell('count', 1)).toHaveAttribute('aria-selected', 'true')

		expect(view.cell('name', 2)).not.toHaveAttribute('aria-selected')
	})

	it('collapses the range on an unshifted move and on Escape', () => {
		const view = renderRangeGrid()

		seedCursor(view.grid)

		fireEvent.keyDown(view.grid, { key: 'ArrowDown', shiftKey: true })

		expect(view.rangeCells()).toBe(2)

		fireEvent.keyDown(view.grid, { key: 'ArrowDown' })

		expect(view.rangeCells()).toBe(0)

		fireEvent.keyDown(view.grid, { key: 'ArrowUp', shiftKey: true })

		expect(view.rangeCells()).toBe(2)

		fireEvent.keyDown(view.grid, { key: 'Escape' })

		expect(view.rangeCells()).toBe(0)
	})

	it('copies the range as TSV through the native copy event', () => {
		const view = renderRangeGrid()

		seedCursor(view.grid)

		fireEvent.keyDown(view.grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(view.grid, { key: 'ArrowRight', shiftKey: true })

		const setData = vi.fn()

		fireEvent.copy(view.grid, { clipboardData: { setData } })

		expect(setData).toHaveBeenCalledWith('text/plain', 'Alice\t2\nBob\t5')
	})

	it('copies the active cell alone when no range is anchored', () => {
		const view = renderRangeGrid()

		seedCursor(view.grid)

		const setData = vi.fn()

		fireEvent.copy(view.grid, { clipboardData: { setData } })

		expect(setData).toHaveBeenCalledWith('text/plain', 'Alice')
	})

	it('pastes a TSV block as one coerced, validated batch through the sink', () => {
		const view = renderRangeGrid({
			editable: true,
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
				{
					id: 'count',
					title: 'Count',
					field: 'count',
					cell: (row) => String(row.count),
					validate: (value) => (typeof value === 'number' && value >= 0 ? null : 'Must be ≥ 0'),
				},
			],
		})

		seedCursor(view.grid)

		fireEvent.paste(view.grid, {
			clipboardData: { getData: () => 'Ann\t7\nBen\t-1\nCol\t9' },
		})

		// One batch: numbers coerced for the count column, the validate-failing
		// -1 dropped, everything else landing from the active cell's top-left.
		expect(view.onValueChange).toHaveBeenCalledTimes(1)

		expect(view.onValueChange).toHaveBeenCalledWith([
			{ rowKey: 1, columnId: 'name', value: 'Ann' },
			{ rowKey: 1, columnId: 'count', value: 7 },
			{ rowKey: 2, columnId: 'name', value: 'Ben' },
			{ rowKey: 3, columnId: 'name', value: 'Col' },
			{ rowKey: 3, columnId: 'count', value: 9 },
		])
	})

	it('clips a pasted block at the grid extent and skips read-only columns', () => {
		const view = renderRangeGrid({
			editable: true,
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
				{
					id: 'count',
					title: 'Count',
					field: 'count',
					cell: (row) => String(row.count),
					readOnly: true,
				},
			],
		})

		seedCursor(view.grid)

		// Move the cursor to the last row; the block's second line has nowhere to go.
		fireEvent.keyDown(view.grid, { key: 'ArrowDown' })

		fireEvent.keyDown(view.grid, { key: 'ArrowDown' })

		fireEvent.paste(view.grid, {
			clipboardData: { getData: () => 'Cleo\t7\nDrop\t8' },
		})

		expect(view.onValueChange).toHaveBeenCalledWith([
			{ rowKey: 3, columnId: 'name', value: 'Cleo' },
		])
	})

	it('does not paste into a non-editable grid', () => {
		const view = renderRangeGrid()

		seedCursor(view.grid)

		const getData = vi.fn(() => 'X')

		fireEvent.paste(view.grid, { clipboardData: { getData } })

		expect(getData).not.toHaveBeenCalled()
	})

	it('fills the range down from its top row on Ctrl+D as one batch', () => {
		const view = renderRangeGrid({ editable: true })

		seedCursor(view.grid)

		// Range (0,0)..(2,0): the name column across all three rows.
		fireEvent.keyDown(view.grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(view.grid, { key: 'ArrowDown', shiftKey: true })

		fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })

		expect(view.onValueChange).toHaveBeenCalledTimes(1)

		expect(view.onValueChange).toHaveBeenCalledWith([
			{ rowKey: 2, columnId: 'name', value: 'Alice' },
			{ rowKey: 3, columnId: 'name', value: 'Alice' },
		])
	})

	it('fills the range right from its left column on Ctrl+R', () => {
		const view = renderRangeGrid({ editable: true })

		seedCursor(view.grid)

		// Range (0,0)..(0,1): the first row across both columns. Fill right
		// copies the left column's value across the row.
		fireEvent.keyDown(view.grid, { key: 'ArrowRight', shiftKey: true })

		fireEvent.keyDown(view.grid, { key: 'r', ctrlKey: true })

		expect(view.onValueChange).toHaveBeenCalledTimes(1)

		expect(view.onValueChange).toHaveBeenCalledWith([
			{ rowKey: 1, columnId: 'count', value: 'Alice' },
		])
	})

	it('does not fill without a real range', () => {
		const view = renderRangeGrid({ editable: true })

		seedCursor(view.grid)

		fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })

		expect(view.onValueChange).not.toHaveBeenCalled()
	})
})

describe('grid TSV utilities', () => {
	it('serializes a block with empty cells for null/undefined', () => {
		expect(
			serializeTsv([
				['a', 1],
				[null, undefined],
			]),
		).toBe('a\t1\n\t')
	})

	it('parses the three newline conventions and drops one trailing empty line', () => {
		expect(parseTsv('a\tb\r\nc\td\n')).toEqual([
			['a', 'b'],
			['c', 'd'],
		])

		expect(parseTsv('a\rb')).toEqual([['a'], ['b']])
	})

	it('coerces pasted text by the target cell type and refuses mismatches', () => {
		expect(coercePastedValue('7', 1)).toBe(7)

		expect(coercePastedValue('x', 1)).toBeUndefined()

		expect(coercePastedValue('yes', false)).toBe(true)

		expect(coercePastedValue('0', true)).toBe(false)

		expect(coercePastedValue('maybe', true)).toBeUndefined()

		expect(coercePastedValue('7', 'seven')).toBe('7')
	})
})
