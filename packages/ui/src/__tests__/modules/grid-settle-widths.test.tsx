import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * The settle store is the heart of the body cells' resize-truncation re-measure.
 * It holds each column's width, `undefined` while a drag is in flight and the
 * settled width otherwise. A visited cell subscribes to its own column. A change
 * after a settle or a keyboard nudge calls only the listeners of that column, so
 * no row renders again.
 */
type Row = { id: number; name: string }

const rows: Row[] = [{ id: 1, name: 'Ada' }]

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', width: 200 },
	{ id: 'select', selectable: true },
]

function renderGrid(resizable = true) {
	return renderHook(() => useGridTable<Row>({ rows, columns, getKey, resizable }))
}

/** Starts a mouse drag on the column's resize handle, as a press on it does. */
function pressHandle(
	result: { current: ReturnType<typeof useGridTable<Row>> },
	id: string,
	clientX: number,
) {
	act(() => result.current.resize?.startResize(id, new MouseEvent('mousedown', { clientX })))
}

/** The settled widths of the two columns, as the store holds them. */
function widths(result: { current: ReturnType<typeof useGridTable<Row>> }) {
	return [result.current.settle.get('name'), result.current.settle.get('select')]
}

describe('the settle store', () => {
	it('holds the settled width per data column at rest, undefined for non-data', () => {
		const { result } = renderGrid()

		// `name` is a data column; the selection column carries no truncation.
		expect(widths(result)).toEqual([200, undefined])
	})

	it('is undefined throughout when the grid is not resizable', () => {
		const { result } = renderGrid(false)

		expect(widths(result)).toEqual([undefined, undefined])
	})

	it('keeps one identity, and calls no listener while the widths are unchanged', () => {
		const { result, rerender } = renderGrid()

		const store = result.current.settle

		const listener = vi.fn()

		store.subscribe('name', listener)

		rerender()

		expect(result.current.settle).toBe(store)

		expect(listener).not.toHaveBeenCalled()
	})

	it('calls the listeners of the changed column only (a nudge)', () => {
		const { result } = renderGrid()

		const name = vi.fn()

		const select = vi.fn()

		result.current.settle.subscribe('name', name)

		result.current.settle.subscribe('select', select)

		// A keyboard nudge moves the width with no drag.
		act(() => result.current.resize?.nudge('name', 40))

		expect(widths(result)).toEqual([240, undefined])

		expect(name).toHaveBeenCalledTimes(1)

		expect(select).not.toHaveBeenCalled()
	})

	it('freezes every column while a drag is in flight, and thaws when it ends', () => {
		const { result } = renderGrid()

		const name = vi.fn()

		result.current.settle.subscribe('name', name)

		pressHandle(result, 'name', 100)

		expect(result.current.resize?.resizing).toBe('name')

		expect(widths(result)).toEqual([undefined, undefined])

		act(() => {
			document.dispatchEvent(new MouseEvent('mousemove', { clientX: 130 }))

			document.dispatchEvent(new MouseEvent('mouseup', { clientX: 130 }))
		})

		expect(result.current.resize?.resizing).toBeNull()

		expect(widths(result)).toEqual([230, undefined])

		// Once as the drag froze the width, and once as it settled: never per frame.
		expect(name).toHaveBeenCalledTimes(2)
	})
})
