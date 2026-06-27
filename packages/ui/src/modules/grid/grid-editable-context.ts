'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import type { Coord, GridEditableCommitAdvance } from './grid-editable-types'
import { cellKey, inRect } from './use-grid-editable-navigation'

// The edit-session slice (draft + commit/cancel) changes on every keystroke and
// is read only by the mounted editor. Cells subscribe to
// `GridEditableStoreContext` for their own derived slice (see
// `useGridEditableCellSlice`), re-rendering only when their slice flips. Cursor
// and selection state is mirrored into that store, not a context, so navigation
// touches only the cells whose slice changed.

/** The live edit-session: the draft string and its commit/cancel actions, read only by the mounted editor. @internal */
export type GridEditableEditValue = {
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	commitEdit: (advance: GridEditableCommitAdvance) => boolean
	cancelEdit: () => void
}

export const [GridEditableEditContext, useGridEditableEdit] =
	createContext<GridEditableEditValue>('GridEditableEdit')

/** Volatile cell-positioning state mirrored into the store for per-cell selection. @internal */
export type GridEditableSnapshot = {
	active: Coord | null
	anchor: Coord | null
	extraCells: Set<string>
	editing: boolean
}

/** External-store interface over the navigation snapshot; built in `useGridEditableStore`. @internal */
export type GridEditableStore = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => GridEditableSnapshot
}

export const [GridEditableStoreContext, useGridEditableStoreContext] =
	createContext<GridEditableStore>('GridEditableStore')

/** Derived per-cell flags. A cell re-renders only when one of these flips. @internal */
export type GridEditableCellSlice = {
	isActive: boolean
	inRange: boolean
	showEditor: boolean
}

/**
 * Subscribes a single cell to the store and returns its derived selection flags.
 * Caches the slice by content: an unchanged cell keeps a stable snapshot and
 * skips re-rendering when an unrelated cell becomes active. The rectangle math
 * still runs per cell (cheap integer compares); reconciliation does not.
 *
 * @internal
 */
export function useGridEditableCellSlice(
	rowIdx: number,
	colIdx: number,
	readOnly: boolean,
): GridEditableCellSlice {
	const store = useGridEditableStoreContext()

	const cacheRef = useRef<GridEditableCellSlice | null>(null)

	const select = useCallback((): GridEditableCellSlice => {
		const { active, anchor, extraCells, editing } = store.getSnapshot()

		const isActive = active?.row === rowIdx && active?.col === colIdx

		const within = !!active && !!anchor && inRect(rowIdx, colIdx, anchor, active)

		const inRange = !isActive && (within || extraCells.has(cellKey(rowIdx, colIdx)))

		const showEditor = isActive && editing && !readOnly

		const prev = cacheRef.current

		if (
			prev &&
			prev.isActive === isActive &&
			prev.inRange === inRange &&
			prev.showEditor === showEditor
		) {
			return prev
		}

		const next: GridEditableCellSlice = { isActive, inRange, showEditor }

		cacheRef.current = next

		return next
	}, [store, rowIdx, colIdx, readOnly])

	return useSyncExternalStore(store.subscribe, select, select)
}
