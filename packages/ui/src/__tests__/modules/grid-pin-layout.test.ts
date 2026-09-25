import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import {
	NEW_ROW_ADD_COLUMN_ID,
	withNewRowAddColumn,
} from '../../modules/grid/engine/grid-new-row-column'
import {
	frozenLayout,
	sameFrozenLayout,
	sameFrozenStructure,
} from '../../modules/grid/engine/grid-pin/layout'
import type { FrozenOffsets } from '../../modules/grid/engine/grid-pin/measure'
import {
	createFrozenOffsetStore,
	writeFrozenOffsets,
} from '../../modules/grid/engine/grid-pin/offsets'
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
