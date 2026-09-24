'use client'

import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import {
	EMPTY_HISTORY,
	type GridHistory,
	type GridHistoryEntry,
	type GridHistoryRead,
	type GridHistoryResult,
	type GridHistoryStep,
	recordHistory,
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
}

/** Whether two history states say the same. */
function sameState(a: GridHistoryState, b: GridHistoryState): boolean {
	return a.canUndo === b.canUndo && a.canRedo === b.canRedo
}

/** A history with no entries, as its state reads. */
const EMPTY_STATE: GridHistoryState = { canUndo: false, canRedo: false }

/**
 * Holds the undo history of an editable grid. A history that the config turns
 * off does not come back when it turns on again. `record` and `take` keep
 * their identity, so the sweep and the settle can read them without a new
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

	const onRef = useRef(on)

	onRef.current = on

	const ref = useRef<GridHistory>(EMPTY_HISTORY)

	// The state last reported, so a change that flips nothing stays silent.
	const reportedRef = useRef(EMPTY_STATE)

	const report = useEffectEvent((state: GridHistoryState) => onChange?.(state))

	const store = useMemo(() => {
		const set = (next: GridHistory) => {
			ref.current = next

			const state = { canUndo: next.undo.length > 0, canRedo: next.redo.length > 0 }

			if (sameState(state, reportedRef.current)) return

			reportedRef.current = state

			report(state)
		}

		return {
			reset: () => set(EMPTY_HISTORY),
			record: (entry: GridHistoryEntry) => {
				if (onRef.current) set(recordHistory(ref.current, entry))
			},
			take: (step: GridHistoryStep, read: GridHistoryRead) => {
				const result = takeHistory(ref.current, step, read)

				set(result.history)

				return result
			},
		}
	}, [])

	useEffect(() => {
		if (!on) store.reset()
	}, [on, store])

	return useMemo(() => ({ on, record: store.record, take: store.take }), [on, store])
}
