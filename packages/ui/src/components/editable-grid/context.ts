'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import type { Coord, EditableGridCommitAdvance } from './types'
import { cellKey } from './use-editable-grid-navigation'

export type EditableGridContextValue = {
	active: Coord | null
	anchor: Coord | null
	extraCells: Set<string>
	editing: boolean
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	setActive: (coord: Coord, extend?: boolean) => void
	addCellToSelection: (coord: Coord) => void
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
	commitEdit: (advance: EditableGridCommitAdvance) => boolean
	cancelEdit: () => void
}

// Internal split. The state slice changes on navigation/selection/edit-toggle
// (not per keystroke) and backs the public `useEditableGrid` view plus the store
// below. The edit-session slice (draft + commit/cancel) changes on every
// keystroke and is read only by the mounted editor. Cells subscribe to
// `EditableGridStoreContext` for their own derived slice (see
// `useEditableGridCellSlice`), re-rendering only when their slice flips.
export type EditableGridStateValue = Pick<
	EditableGridContextValue,
	'active' | 'anchor' | 'extraCells' | 'editing' | 'setActive' | 'addCellToSelection' | 'beginEdit'
>

export type EditableGridEditValue = Pick<
	EditableGridContextValue,
	'draft' | 'setDraft' | 'commitEdit' | 'cancelEdit'
>

export const [EditableGridStateContext, useEditableGridState] =
	createContext<EditableGridStateValue>('EditableGridState')

export const [EditableGridEditContext, useEditableGridEdit] =
	createContext<EditableGridEditValue>('EditableGridEdit')

/**
 * Combined state + edit-session view. Re-renders on any change, including every
 * keystroke — prefer `useEditableGridEdit` (editor) or `useEditableGridCellSlice`
 * (cell) internally; this is the stable public surface for external consumers.
 */
export function useEditableGrid(): EditableGridContextValue {
	return { ...useEditableGridState(), ...useEditableGridEdit() }
}

/** Volatile cell-positioning state mirrored into the store for per-cell selection. */
export type EditableGridSnapshot = Pick<
	EditableGridContextValue,
	'active' | 'anchor' | 'extraCells' | 'editing'
>

/** External-store interface over the navigation snapshot; built in `useEditableGridStore`. */
export type EditableGridStore = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => EditableGridSnapshot
}

export const [EditableGridStoreContext, useEditableGridStoreContext] =
	createContext<EditableGridStore>('EditableGridStore')

/** Derived per-cell flags. A cell re-renders only when one of these flips. */
export type EditableGridCellSlice = {
	isActive: boolean
	inRange: boolean
	showEditor: boolean
}

/**
 * Subscribes a single cell to the store and returns its derived selection flags.
 * The slice is cached by content so an unchanged cell keeps a stable snapshot and
 * skips re-rendering when an unrelated cell becomes active — the rectangle math
 * still runs per cell (cheap integer compares), but reconciliation does not.
 */
export function useEditableGridCellSlice(
	rowIdx: number,
	colIdx: number,
	readOnly: boolean,
): EditableGridCellSlice {
	const store = useEditableGridStoreContext()

	const cacheRef = useRef<EditableGridCellSlice | null>(null)

	const select = useCallback((): EditableGridCellSlice => {
		const { active, anchor, extraCells, editing } = store.getSnapshot()

		const isActive = active?.row === rowIdx && active?.col === colIdx

		const inRect =
			!!active &&
			!!anchor &&
			rowIdx >= Math.min(anchor.row, active.row) &&
			rowIdx <= Math.max(anchor.row, active.row) &&
			colIdx >= Math.min(anchor.col, active.col) &&
			colIdx <= Math.max(anchor.col, active.col)

		const inRange = !isActive && (inRect || extraCells.has(cellKey(rowIdx, colIdx)))

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

		const next: EditableGridCellSlice = { isActive, inRange, showEditor }

		cacheRef.current = next

		return next
	}, [store, rowIdx, colIdx, readOnly])

	return useSyncExternalStore(store.subscribe, select, select)
}
