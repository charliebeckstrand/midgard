'use client'

import { useEffect, useMemo, useRef } from 'react'
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

/**
 * Holds the undo history of an editable grid. A history that the config turns
 * off does not come back when it turns on again. `record` and `take` keep
 * their identity, so the sweep and the settle can read them without a new
 * dependency.
 *
 * @param enabled - Whether the grid is editable.
 * @param history - The {@link GridEditableConfig.history} flag.
 * @internal
 */
export function useGridEditHistory(
	enabled: boolean,
	history: boolean | undefined,
): GridEditHistory {
	const on = enabled && history === true

	const onRef = useRef(on)

	onRef.current = on

	const ref = useRef<GridHistory>(EMPTY_HISTORY)

	useEffect(() => {
		if (!on) ref.current = EMPTY_HISTORY
	}, [on])

	const store = useMemo(
		() => ({
			record: (entry: GridHistoryEntry) => {
				if (onRef.current) ref.current = recordHistory(ref.current, entry)
			},
			take: (step: GridHistoryStep, read: GridHistoryRead) => {
				const result = takeHistory(ref.current, step, read)

				ref.current = result.history

				return result
			},
		}),
		[],
	)

	return useMemo(() => ({ on, ...store }), [on, store])
}
