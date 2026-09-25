import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import {
	NEW_ROW_ADD_COLUMN_ID,
	withNewRowAddColumn,
} from '../../modules/grid/engine/grid-new-row-column'
import { frozenLayout, sameFrozenLayout } from '../../modules/grid/engine/grid-pin/layout'
import type { FrozenOffsets } from '../../modules/grid/engine/grid-pin/measure'
import {
	buildColumnPinning,
	toColumnPinningState,
} from '../../modules/grid/engine/grid-table/views'
import { useGridTable } from '../../modules/grid/use-grid-table'

/** One frozen column: its id and its width. */
type Pin = [id: string, width: number]

/**
 * The layout of two frozen sections, each in edge order. The offsets and the
 * boundary fall out of each column's place in its section, which is the
 * derivation under test.
 */
function layoutOf(left: Pin[], right: Pin[] = [], measured: FrozenOffsets | null = null) {
	return frozenLayout(
		{ left: left.map(([id]) => id), right: right.map(([id]) => id) },
		new Map([...left, ...right]),
		measured,
	)
}

/**
 * The frozen layout the pinned chrome draws from. It is a snapshot, not a live
 * reader: rows, cells, and headers all hold on `memo`, so a pin joining the group
 * or a drag moving a width reaches them only through this value's identity.
 */
describe('frozen column layout', () => {
	// Name and Email freeze left, Status holds the right edge.
	const left: Pin[] = [
		['name', 160],
		['email', 200],
	]

	const right: Pin[] = [['status', 120]]

	it('resolves both frozen sections, in edge order', () => {
		// The boundary lands on each group's innermost column: the last of the left
		// section, the first of the right one.
		expect([...layoutOf(left, right)]).toEqual([
			['name', { side: 'left', offset: 0, boundary: false }],
			['email', { side: 'left', offset: 160, boundary: true }],
			['status', { side: 'right', offset: 0, boundary: true }],
		])
	})

	it('sticks each right column at the summed width of the columns after it', () => {
		const layout = layoutOf(
			[],
			[
				['status', 120],
				['total', 90],
			],
		)

		expect(layout.get('status')).toEqual({ side: 'right', offset: 90, boundary: true })

		expect(layout.get('total')).toEqual({ side: 'right', offset: 0, boundary: false })
	})

	it('takes a measured offset over the summed widths, column by column', () => {
		// The auto-layout case: the header measurement covers the left stack, and the
		// summed widths stand for the column it has no entry for.
		const measured: FrozenOffsets = {
			left: new Map([
				['name', 0],
				['email', 214],
			]),
			right: new Map(),
		}

		const layout = layoutOf(left, right, measured)

		expect(layout.get('email')?.offset).toBe(214)

		expect(layout.get('status')?.offset).toBe(0)
	})

	it('reads two resolutions equal only when every frozen column lands identically', () => {
		const layout = layoutOf(left, right)

		expect(sameFrozenLayout(layout, layoutOf(left, right))).toBe(true)

		// A drag on a column ahead of the stack moves the ones behind it.
		const dragged = layoutOf(
			[
				['name', 250],
				['email', 200],
			],
			right,
		)

		expect(sameFrozenLayout(layout, dragged)).toBe(false)

		// An unpin puts the boundary — and the edge rule with it — on another column.
		expect(sameFrozenLayout(layout, layoutOf([['name', 160]], right))).toBe(false)
	})
})

/**
 * The grid carries the layout across `memo` boundaries through the identity of
 * its `pinning` value. It must hold that reference while the frozen columns are
 * where they were — a drag on a scrolling column must not re-render every row —
 * and yield a fresh one the moment one of them moves.
 */
describe('the pinning value of useGridTable', () => {
	type Row = { id: number; name: string; email: string; status: string }

	const rows: Row[] = [{ id: 1, name: 'Ada', email: 'ada@example.com', status: 'Active' }]

	const getKey = (row: Row) => row.id

	const name: GridColumn<Row> = { id: 'name', field: 'name', width: 160, pinned: true }

	const email: GridColumn<Row> = { id: 'email', field: 'email', width: 200 }

	const status: GridColumn<Row> = { id: 'status', field: 'status', width: 120 }

	function renderGrid(initial: GridColumn<Row>[]) {
		return renderHook(
			({ columns }) => useGridTable<Row>({ rows, columns, getKey, resizable: true }),
			{ initialProps: { columns: initial } },
		)
	}

	it('holds its reference while the frozen columns are unchanged', () => {
		const { result } = renderGrid([name, email, status])

		const first = result.current.pinning

		// A width change on a scrolling column moves no frozen offset, and must not
		// churn the rows.
		act(() => result.current.resize?.nudge('status', 40))

		expect(result.current.resize?.getSize('status')).toBe(160)

		expect(result.current.pinning).toBe(first)
	})

	it('yields a fresh layout when a frozen column moves', () => {
		const { result } = renderGrid([name, { ...email, pinned: true }, status])

		const first = result.current.pinning

		act(() => result.current.resize?.nudge('name', 40))

		expect(result.current.pinning).not.toBe(first)

		expect(result.current.pinning?.column('email')?.offset).toBe(200)
	})

	it('yields a fresh layout when a column joins the group and takes the boundary', () => {
		const { result, rerender } = renderGrid([name, email, status])

		const first = result.current.pinning

		rerender({ columns: [name, { ...email, pinned: true }, status] })

		expect(result.current.pinning).not.toBe(first)

		// The rule follows the boundary onto the joining column, off the one it displaced.
		expect(result.current.pinning?.column('email')).toEqual({
			side: 'left',
			offset: 160,
			boundary: true,
		})

		expect(result.current.pinning?.column('name')?.boundary).toBe(false)
	})

	it('resolves nothing for a grid with no frozen column', () => {
		const { result } = renderGrid([{ ...name, pinned: undefined }, email, status])

		expect(result.current.pinning).toBeNull()
	})
})

/**
 * The Add column of the new-row slot is locked to the inline end, but it stays
 * quiet: it pins no other column, and its cells draw no frozen chrome.
 */
describe('the Add column of the new-row slot', () => {
	type Row = { id: number; name: string; status: string }

	const name: GridColumn<Row> = { id: 'name', field: 'name' }

	const status: GridColumn<Row> = { id: 'status', field: 'status' }

	const select: GridColumn<Row> = { id: 'select', selectable: true }

	it('turns the freeze on, but does not pull the selection column to the left edge', () => {
		const { state, hasPinned } = toColumnPinningState(
			withNewRowAddColumn([select, name, status], 48),
		)

		expect(hasPinned).toBe(true)

		expect(state).toEqual({ left: [], right: [NEW_ROW_ADD_COLUMN_ID] })
	})

	it('keeps the selection column first when another column is frozen too', () => {
		const { state } = toColumnPinningState(
			withNewRowAddColumn([select, name, { ...status, locked: 'right' }], 48),
		)

		// The Add column is the last column of the right edge.
		expect(state).toEqual({ left: ['select'], right: ['status', NEW_ROW_ADD_COLUMN_ID] })
	})

	it('reads as a column that scrolls, while a frozen column sticks inside it', () => {
		const layout = layoutOf(
			[],
			[
				['status', 120],
				[NEW_ROW_ADD_COLUMN_ID, 48],
			],
		)

		const pinning = buildColumnPinning(layout)

		expect(pinning.column(NEW_ROW_ADD_COLUMN_ID)).toBeUndefined()

		expect(pinning.column('status')).toEqual({ side: 'right', offset: 48, boundary: true })
	})
})
