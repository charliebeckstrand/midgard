import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridEditableColumn } from '../../modules/grid/grid-editable-types'
import { useGridEditableHistory } from '../../modules/grid/use-grid-editable-history'

type Row = { id: number; rate: number }

function setup(rows: Row[] = [{ id: 1, rate: 2.35 }]) {
	const onValueChange = vi.fn()

	const rowsRef = { current: rows }

	const editableCols: GridEditableColumn<Row>[] = [{ id: 'rate', field: 'rate' }]

	const { result } = renderHook(() =>
		useGridEditableHistory<Row>({ rowsRef, editableCols, getKey: (row) => row.id, onValueChange }),
	)

	return { result, onValueChange, rowsRef }
}

describe('useGridEditableHistory', () => {
	const forward = [{ rowKey: 1, columnId: 'rate', value: 5 }]

	const inverse = [{ rowKey: 1, columnId: 'rate', value: 2.35 }]

	it('forwards a committed batch and records it for undo', () => {
		const { result, onValueChange } = setup()

		act(() => result.current.emit(forward))

		expect(onValueChange).toHaveBeenCalledWith(forward)

		expect(result.current.canUndo).toBe(true)

		expect(result.current.canRedo).toBe(false)
	})

	it('undo re-emits the cells prior values', () => {
		const { result, onValueChange } = setup()

		act(() => result.current.emit(forward))

		act(() => result.current.undo())

		expect(onValueChange).toHaveBeenLastCalledWith(inverse)

		expect(result.current.canUndo).toBe(false)

		expect(result.current.canRedo).toBe(true)
	})

	it('redo replays the forward batch', () => {
		const { result, onValueChange } = setup()

		act(() => result.current.emit(forward))

		act(() => result.current.undo())

		act(() => result.current.redo())

		expect(onValueChange).toHaveBeenLastCalledWith(forward)

		expect(result.current.canRedo).toBe(false)

		expect(result.current.canUndo).toBe(true)
	})

	it('a fresh edit clears the redo stack', () => {
		const { result } = setup()

		act(() => result.current.emit(forward))

		act(() => result.current.undo())

		expect(result.current.canRedo).toBe(true)

		act(() => result.current.emit([{ rowKey: 1, columnId: 'rate', value: 9 }]))

		expect(result.current.canRedo).toBe(false)
	})

	it('ignores an empty batch', () => {
		const { result, onValueChange } = setup()

		act(() => result.current.emit([]))

		expect(onValueChange).not.toHaveBeenCalled()

		expect(result.current.canUndo).toBe(false)
	})
})
