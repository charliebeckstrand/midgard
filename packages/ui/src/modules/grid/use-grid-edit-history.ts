'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	EMPTY_HISTORY,
	type GridHistory,
	type GridHistoryCell,
	type GridHistoryEntry,
	type GridHistoryRead,
	type GridHistoryResult,
	type GridHistoryStep,
	recordHistory,
	restoreHistory,
	takeHistory,
} from './engine/grid-edit-history'
import type { GridHistoryState } from './grid-editing-types'

/**
 * The undo history of an editable grid, as the editing layer reads it. The
 * history lives in a ref, because no cell renders from it.
 *
 * @internal
 */
export type GridEditHistory = {
	/** Whether {@link GridEditableConfig.history} turns the history on. */
	on: boolean
	/** Records one saved entry. It does nothing while the history is off. */
	record: (entry: GridHistoryEntry) => void
	/** Takes one step, and keeps the history that the step leaves. */
	take: (step: GridHistoryStep, read: GridHistoryRead) => GridHistoryResult
	/** Puts back the cells of a step that the sink refused. */
	restore: (step: GridHistoryStep, refused: readonly GridHistoryCell[]) => void
}

/** Whether two history states say the same. */
function sameState(a: GridHistoryState, b: GridHistoryState): boolean {
	return a.canUndo === b.canUndo && a.canRedo === b.canRedo
}

/** A history with no entries, as its state reads. */
const EMPTY_STATE: GridHistoryState = { canUndo: false, canRedo: false }

/**
 * Holds the undo history of an editable grid. A history that the config turns
 * off does not come back when it turns on again. `record`, `take`, and
 * `restore` keep their identity, so the sweep and the settle can read them without a new
 * dependency. `onChange` hears the state each time either value flips.
 *
 * @param enabled - Whether the grid is editable.
 * @param history - The {@link GridEditableConfig.history} flag.
 * @param onChange - The {@link GridEditableConfig.onHistoryChange} callback.
 * @internal
 */
export function useGridEditHistory(
	enabled: boolean,
	history: boolean | undefined,
	onChange?: (state: GridHistoryState) => void,
): GridEditHistory {
	const on = enabled && history === true

	const ref = useRef<GridHistory>(EMPTY_HISTORY)

	// The state last reported, so a change that flips nothing stays silent.
	const reportedRef = useRef(EMPTY_STATE)

	const set = useStableEvent((next: GridHistory) => {
		ref.current = next

		const state = { canUndo: next.undo.length > 0, canRedo: next.redo.length > 0 }

		if (sameState(state, reportedRef.current)) return

		reportedRef.current = state

		onChange?.(state)
	})

	const record = useStableEvent((entry: GridHistoryEntry) => {
		if (on) set(recordHistory(ref.current, entry))
	})

	const take = useStableEvent((step: GridHistoryStep, read: GridHistoryRead) => {
		const result = takeHistory(ref.current, step, read)

		set(result.history)

		return result
	})

	const restore = useStableEvent((step: GridHistoryStep, refused: readonly GridHistoryCell[]) => {
		if (on) set(restoreHistory(ref.current, step, refused))
	})

	useEffect(() => {
		if (!on) set(EMPTY_HISTORY)
	}, [on, set])

	return useMemo(() => ({ on, record, take, restore }), [on, record, take, restore])
}
