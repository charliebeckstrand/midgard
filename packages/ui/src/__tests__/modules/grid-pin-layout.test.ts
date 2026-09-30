import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import {
	NEW_ROW_ADD_COLUMN_ID,
	withNewRowAddColumn,
} from '../../modules/grid/engine/grid-new-row-column'
import { sameFrozenLayout, sameFrozenStructure } from '../../modules/grid/engine/grid-pin/layout'
import {
	createFrozenOffsetStore,
	writeFrozenOffsets,
} from '../../modules/grid/engine/grid-pin/offsets'
import {
	buildColumnPinning,
	toColumnPinningState,
} from '../../modules/grid/engine/grid-table/pinning-view'
import { useGridTable } from '../../modules/grid/use-grid-table'
import { layoutOf } from '../helpers/grid-frozen-layout'

/**
 * The grid carries the frozen structure across `memo` boundaries through the
 * identity of its `pinning` value. It holds that reference while each frozen
 * column keeps its edge and its boundary role, so a drag re-renders no row. It
 * gives a fresh one when a column joins the group, leaves it, or changes edge.
 * An offset move reaches the cells through the offset store.
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

	it('holds its reference when a frozen offset moves, and gives the committed offset', () => {
		const { result } = renderGrid([name, { ...email, pinned: true }, status])

		const first = result.current.pinning

		expect(first?.offset('email')).toBe(160)

		act(() => result.current.resize?.nudge('name', 40))

		expect(result.current.pinning).toBe(first)

		expect(result.current.pinning?.offset('email')).toBe(200)
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

		expect(state).toEqual({ start: [], end: [NEW_ROW_ADD_COLUMN_ID] })
	})

	it('keeps the selection column first when another column is frozen too', () => {
		const { state } = toColumnPinningState(
			withNewRowAddColumn([select, name, { ...status, locked: 'right' }], 48),
		)

		// The Add column is the last column of the right edge.
		expect(state).toEqual({ start: ['select'], end: ['status', NEW_ROW_ADD_COLUMN_ID] })
	})

	it('reads as a column that scrolls, while a frozen column sticks inside it', () => {
		const layout = layoutOf(
			[],
			[
				['status', 120],
				[NEW_ROW_ADD_COLUMN_ID, 48],
			],
		)

		const pinning = buildColumnPinning(layout, createFrozenOffsetStore(layout))

		expect(pinning.column(NEW_ROW_ADD_COLUMN_ID)).toBeUndefined()

		expect(pinning.column('status')).toEqual({ side: 'right', offset: 48, boundary: true })

		expect(pinning.offset(NEW_ROW_ADD_COLUMN_ID)).toBeUndefined()

		expect(pinning.offset('status')).toBe(48)
	})
})

/**
 * The structure of the layout keys the `pinning` view. The offsets travel apart
 * from it: the store holds the committed layout, and the grid writes the moved
 * offsets to the frozen cells.
 */
describe('frozen offsets apart from the structure', () => {
	const before = layoutOf([
		['name', 160],
		['email', 200],
	])

	const after = layoutOf([
		['name', 240],
		['email', 200],
	])

	/** A frozen cell of `id`, with an inline offset on `property`. */
	function frozenCell(id: string, property: string, value: string): HTMLElement {
		const cell = document.createElement('td')

		cell.setAttribute('data-grid-pin', id)

		cell.style.setProperty(property, value)

		return cell
	}

	it('reads two layouts as one structure when only an offset moved', () => {
		expect(sameFrozenStructure(before, after)).toBe(true)

		expect(sameFrozenLayout(before, after)).toBe(false)
	})

	it('reads a new structure when the boundary moves or a column changes edge', () => {
		expect(sameFrozenStructure(before, layoutOf([['name', 160]]))).toBe(false)

		expect(sameFrozenStructure(before, layoutOf([['name', 160]], [['email', 200]]))).toBe(false)
	})

	it('gives the committed offset only for the edge that the layout commits', () => {
		const store = createFrozenOffsetStore(before)

		expect(store.get('email', 'left')).toBe(160)

		expect(store.commit(after)).toBe(before)

		expect(store.get('email', 'left')).toBe(240)

		expect(store.get('email', 'right')).toBeUndefined()

		expect(store.get('status', 'left')).toBeUndefined()
	})

	it('prefers the committed offset over the one of the structure snapshot', () => {
		const store = createFrozenOffsetStore(before)

		const pinning = buildColumnPinning(before, store)

		store.commit(after)

		expect(pinning.column('email')?.offset).toBe(160)

		expect(pinning.offset('email')).toBe(240)
	})

	it('writes the new offset to the cells of each moved column only', () => {
		const container = document.createElement('table')

		const name = frozenCell('name', 'inset-inline-start', '0px')

		const email = frozenCell('email', 'inset-inline-start', '160px')

		container.append(name, email)

		writeFrozenOffsets(container, before, after)

		expect(email.style.getPropertyValue('inset-inline-start')).toBe('240px')

		expect(name.style.getPropertyValue('inset-inline-start')).toBe('0px')
	})

	it('writes the inline-end offset of a right-frozen column', () => {
		const from = layoutOf(
			[],
			[
				['status', 120],
				['actions', 80],
			],
		)

		const to = layoutOf(
			[],
			[
				['status', 120],
				['actions', 100],
			],
		)

		const container = document.createElement('table')

		const status = frozenCell('status', 'inset-inline-end', '80px')

		container.append(status)

		writeFrozenOffsets(container, from, to)

		expect(status.style.getPropertyValue('inset-inline-end')).toBe('100px')
	})

	it('writes nothing when no offset moved', () => {
		const container = document.createElement('table')

		const email = frozenCell('email', 'inset-inline-start', '999px')

		container.append(email)

		const same = layoutOf([
			['name', 160],
			['email', 200],
		])

		writeFrozenOffsets(container, before, same)

		expect(email.style.getPropertyValue('inset-inline-start')).toBe('999px')
	})
})
