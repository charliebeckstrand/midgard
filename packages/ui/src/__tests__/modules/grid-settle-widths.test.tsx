import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * `settleWidths` is the heart of the body cells' resize-truncation re-measure.
 * It hands each column a width that is `undefined` while a drag is in flight, so
 * the memoized cells hold frame to frame, and the settled width otherwise. Its
 * reference holds while the widths are unchanged. A change after a settle or a
 * keyboard nudge is what re-renders a column's cells to re-measure overflow.
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

describe('settleWidths', () => {
	it('reports the settled width per data column at rest, undefined for non-data', () => {
		const { result } = renderGrid()

		// `name` is a data column; the selection column carries no truncation.
		expect(result.current.settleWidths).toEqual([200, undefined])
	})

	it('is undefined throughout when the grid is not resizable', () => {
		const { result } = renderGrid(false)

		expect(result.current.settleWidths).toEqual([undefined, undefined])
	})

	it('holds a stable reference while the widths are unchanged (no per-frame churn)', () => {
		const { result, rerender } = renderGrid()

		const first = result.current.settleWidths

		rerender()

		expect(result.current.settleWidths).toBe(first)
	})

	it('yields a fresh snapshot when a column width changes (a nudge)', () => {
		const { result } = renderGrid()

		const first = result.current.settleWidths

		// A keyboard nudge moves the width with no drag.
		act(() => result.current.resize?.nudge('name', 40))

		expect(result.current.settleWidths).not.toBe(first)

		expect(result.current.settleWidths).toEqual([240, undefined])
	})

	it('freezes every column while a drag is in flight, and thaws when it ends', () => {
		const { result } = renderGrid()

		pressHandle(result, 'name', 100)

		expect(result.current.resize?.resizing).toBe('name')

		expect(result.current.settleWidths).toEqual([undefined, undefined])

		act(() => {
			document.dispatchEvent(new MouseEvent('mousemove', { clientX: 130 }))

			document.dispatchEvent(new MouseEvent('mouseup', { clientX: 130 }))
		})

		expect(result.current.resize?.resizing).toBeNull()

		expect(result.current.settleWidths).toEqual([230, undefined])
	})
})
