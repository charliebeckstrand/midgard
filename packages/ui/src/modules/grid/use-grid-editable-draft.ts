'use client'

import { type RefObject, type SetStateAction, useCallback, useRef, useState } from 'react'
import type {
	Coord,
	GridEditableDraftApi,
	GridEditableMutationsApi,
	GridEditableNavigationApi,
	GridEditableRowsApi,
} from './grid-editable-types'

/**
 * Owns the lifecycle of an in-progress cell edit: the draft buffer, the
 * once-per-session commit guard, and the lossy-format diff baseline. Routes
 * commits through `applyBulkFill` when a multi-cell selection is active and
 * through `applyCellWrite` otherwise, then advances the cursor.
 */
export function useGridEditableDraft<T>({
	nav: { active, anchorRef, extraCellsRef, moveActive, moveActiveTab, setActive },
	mutations: { applyCellWrite, applyBulkFill },
	rows: { editableCols },
	wrapperRef,
}: {
	nav: GridEditableNavigationApi
	mutations: GridEditableMutationsApi
	rows: GridEditableRowsApi<T>
	wrapperRef: RefObject<HTMLTableElement | null>
}): GridEditableDraftApi {
	const [editing, setEditing] = useState(false)

	const [draft, setDraftState] = useState('')

	// Mirror the draft into a ref so a commit always reads the latest keystroke,
	// even when blur fires in the same tick as the change — before the `setDraft`
	// re-render lands and refreshes `commitEdit`'s closure. Without this the
	// blur commit can save a stale draft, dropping the last edit.
	const draftRef = useRef('')

	const setDraft = useCallback((next: SetStateAction<string>) => {
		const value = typeof next === 'function' ? next(draftRef.current) : next

		draftRef.current = value

		setDraftState(value)
	}, [])

	// Prevents the commit-on-blur from firing again after an explicit Enter /
	// Tab / Escape commit; ensures a single commit per edit session.
	const sessionClosedRef = useRef(false)

	// The cell's formatted display value when editing began. Commits skip when
	// this matches the draft; a lossy format→parse round-trip (e.g. "$2.35" →
	// NaN) does not overwrite an unchanged cell.
	const originalFormattedRef = useRef('')

	const beginEdit = useCallback(
		(coord: Coord, initial?: string, original?: string) => {
			const col = editableCols[coord.col]

			if (!col || col.readOnly) return

			const initialDraft = initial ?? ''

			sessionClosedRef.current = false

			originalFormattedRef.current = original ?? initialDraft

			setActive(coord)

			setDraft(initialDraft)

			setEditing(true)
		},
		[editableCols, setActive, setDraft],
	)

	const commitEdit = useCallback(
		(advance: 'down' | 'right' | 'left' | 'none') => {
			if (sessionClosedRef.current) return true

			sessionClosedRef.current = true

			setEditing(false)

			// Read the live draft, not the closure's: blur can fire before the last
			// keystroke's re-render refreshes this callback.
			const committed = draftRef.current

			if (active && committed !== originalFormattedRef.current) {
				if (anchorRef.current || extraCellsRef.current.size > 0) applyBulkFill(committed)
				else applyCellWrite(active.row, active.col, committed)
			}

			let stayedInGrid = true

			if (advance === 'down') moveActive(1, 0)
			else if (advance === 'right') stayedInGrid = moveActiveTab(1)
			else if (advance === 'left') stayedInGrid = moveActiveTab(-1)

			if (stayedInGrid) wrapperRef.current?.focus()

			return stayedInGrid
		},
		[
			active,
			anchorRef,
			extraCellsRef,
			applyCellWrite,
			applyBulkFill,
			moveActive,
			moveActiveTab,
			wrapperRef,
		],
	)

	const cancelEdit = useCallback(() => {
		sessionClosedRef.current = true

		setEditing(false)

		setDraft('')

		wrapperRef.current?.focus()
	}, [wrapperRef, setDraft])

	return { editing, draft, setDraft, beginEdit, commitEdit, cancelEdit }
}
