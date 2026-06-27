'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import type { Coord, GridEditableCommitAdvance } from './grid-editable-types'
import { cellKey, inRect } from './use-grid-editable-navigation'

// The edit-session slice (draft + commit/cancel) changes on every keystroke and
// is read only by the mounted editor. Cells subscribe to
// `GridEditableStoreContext` for their own derived slice (see
// `useGridEditableCellSlice`), re-rendering only when their slice flips. Cursor
// and selection state is mirrored into that store, not a context, so navigation
// touches only the cells whose slice changed.

/** The live edit-session: the draft string, its validation error, and its commit/cancel actions, read only by the mounted editor. @internal */
export type GridEditableEditValue = {
	draft: string
	/** Validation message for the open edit, or `null` when valid. A failed commit keeps the editor open and sets this. */
	error: string | null
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
 * The eight possible cell slices, interned so equal flags resolve to one frozen
 * reference. `useSyncExternalStore` skips a re-render on an `Object.is` snapshot
 * match, so the cell selector must be a pure function of the flags that returns
 * a stable reference. Interning replaces a render-phase cache write, which is
 * unsafe under concurrent rendering — an aborted render could leave a phantom
 * cached slice and tear a later read.
 *
 * @internal
 */
const CELL_SLICES: readonly GridEditableCellSlice[] = Array.from({ length: 8 }, (_, bits) =>
	Object.freeze({
		isActive: (bits & 0b100) !== 0,
		inRange: (bits & 0b010) !== 0,
		showEditor: (bits & 0b001) !== 0,
	}),
)

/** The interned {@link GridEditableCellSlice} for a flag triple (see {@link CELL_SLICES}). @internal */
function internCellSlice(
	isActive: boolean,
	inRange: boolean,
	showEditor: boolean,
): GridEditableCellSlice {
	const bits = (isActive ? 0b100 : 0) | (inRange ? 0b010 : 0) | (showEditor ? 0b001 : 0)

	// `bits` is always 0–7, so the lookup is total; the assertion drops the
	// `noUncheckedIndexedAccess` `| undefined`.
	return CELL_SLICES[bits] as GridEditableCellSlice
}

/**
 * Subscribes a single cell to the store and returns its derived selection flags.
 * Returns an interned slice: equal flags resolve to one stable reference, so an
 * unchanged cell keeps its snapshot and skips re-rendering when an unrelated
 * cell becomes active. The rectangle math still runs per cell (cheap integer
 * compares); reconciliation does not.
 *
 * @internal
 */
export function useGridEditableCellSlice(
	rowIdx: number,
	colIdx: number,
	readOnly: boolean,
): GridEditableCellSlice {
	const store = useGridEditableStoreContext()

	const select = useCallback((): GridEditableCellSlice => {
		const { active, anchor, extraCells, editing } = store.getSnapshot()

		const isActive = active?.row === rowIdx && active?.col === colIdx

		const within = !!active && !!anchor && inRect(rowIdx, colIdx, anchor, active)

		const inRange = !isActive && (within || extraCells.has(cellKey(rowIdx, colIdx)))

		const showEditor = isActive && editing && !readOnly

		return internCellSlice(isActive, inRange, showEditor)
	}, [store, rowIdx, colIdx, readOnly])

	return useSyncExternalStore(store.subscribe, select, select)
}
