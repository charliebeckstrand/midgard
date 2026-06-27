'use client'

import { type RefObject, useCallback, useReducer, useRef } from 'react'
import type { CellChange, GridEditableColumn } from './grid-editable-types'

/** One undoable step: the committed `forward` changes and the `inverse` that restores the prior values. @internal */
type HistoryEntry = { forward: CellChange[]; inverse: CellChange[] }

/**
 * Undo/redo over the editable grid's committed changes: `emit` records each
 * write and forwards it, while `undo`/`redo` replay the stored batches. @internal
 */
export type GridEditableHistoryApi = {
	/** Records the batch (capturing its inverse) and forwards it to the consumer. */
	emit: (changes: CellChange[]) => void
	undo: () => void
	redo: () => void
	canUndo: boolean
	canRedo: boolean
}

/**
 * Threads undo/redo through the editable grid's commit sink. The grid doesn't
 * own its rows — the consumer applies each {@link CellChange} batch and feeds the
 * result back as `rows` — so history is value-based: `emit` reads each changed
 * cell's *current* value from the live rows (before the consumer applies the
 * write) to build an inverse batch, stacks the pair, then forwards the change.
 * `undo` re-emits the inverse and `redo` the forward, both through the same
 * `onValueChange`, so a round-trip restores the exact prior values. A fresh edit
 * clears the redo stack.
 *
 * @typeParam T - The row type backing each grid row.
 * @internal
 */
export function useGridEditableHistory<T>({
	rowsRef,
	editableCols,
	getKey,
	onValueChange,
}: {
	rowsRef: RefObject<T[]>
	editableCols: GridEditableColumn<T>[]
	getKey: (row: T, index: number) => string | number
	onValueChange: (changes: CellChange[]) => void
}): GridEditableHistoryApi {
	const undoStack = useRef<HistoryEntry[]>([])

	const redoStack = useRef<HistoryEntry[]>([])

	// Re-render so `canUndo`/`canRedo` track the (ref-held) stacks.
	const [, bump] = useReducer((count: number) => count + 1, 0)

	// The cell's current value, read from the live rows for the inverse batch.
	// The consumer writes a change's value to the field named by its column
	// (`field`, else the column id), so the inverse reads back from there.
	const priorValue = useCallback(
		(change: CellChange): CellChange => {
			const col = editableCols.find((candidate) => candidate.id === change.columnId)

			const field = (col?.field ?? change.columnId) as keyof T

			const rows = rowsRef.current

			const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)

			const value = index >= 0 ? rows[index]?.[field] : undefined

			return { rowKey: change.rowKey, columnId: change.columnId, value }
		},
		[editableCols, rowsRef, getKey],
	)

	const emit = useCallback(
		(changes: CellChange[]) => {
			if (!changes.length) return

			undoStack.current.push({ forward: changes, inverse: changes.map(priorValue) })

			redoStack.current = []

			bump()

			onValueChange(changes)
		},
		[priorValue, onValueChange],
	)

	const undo = useCallback(() => {
		const entry = undoStack.current.pop()

		if (!entry) return

		redoStack.current.push(entry)

		bump()

		onValueChange(entry.inverse)
	}, [onValueChange])

	const redo = useCallback(() => {
		const entry = redoStack.current.pop()

		if (!entry) return

		undoStack.current.push(entry)

		bump()

		onValueChange(entry.forward)
	}, [onValueChange])

	return {
		emit,
		undo,
		redo,
		canUndo: undoStack.current.length > 0,
		canRedo: redoStack.current.length > 0,
	}
}
