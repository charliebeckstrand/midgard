'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import type {
	Coord,
	EditableGridDraftApi,
	EditableGridMutationsApi,
	EditableGridNavigationApi,
	EditableGridRowsApi,
} from './types'

/**
 * Owns the lifecycle of an in-progress cell edit: the draft buffer, the
 * once-per-session commit guard, and the lossy-format diff baseline. Routes
 * commits through `applyBulkFill` when a multi-cell selection is active and
 * through `applyCellWrite` otherwise, then advances the cursor.
 */
export function useEditableGridDraft<T>({
	nav: { active, anchorRef, extraCellsRef, moveActive, moveActiveTab, setActive },
	mutations: { applyCellWrite, applyBulkFill },
	rows: { editableCols },
	wrapperRef,
}: {
	nav: EditableGridNavigationApi
	mutations: EditableGridMutationsApi
	rows: EditableGridRowsApi<T>
	wrapperRef: RefObject<HTMLTableElement | null>
}): EditableGridDraftApi {
	const [editing, setEditing] = useState(false)

	const [draft, setDraft] = useState('')

	// Guards the commit-on-blur that fires when the input unmounts after an
	// explicit Enter / Tab / Escape commit. Ensures a single commit per session.
	const sessionClosedRef = useRef(false)

	// The cell's formatted display value when editing began. Used to skip no-op
	// commits so a lossy format→parse round-trip (e.g. "$2.35" → NaN) never
	// overwrites an unchanged cell.
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
		[editableCols, setActive],
	)

	const commitEdit = useCallback(
		(advance: 'down' | 'right' | 'left' | 'none') => {
			if (sessionClosedRef.current) return true

			sessionClosedRef.current = true

			setEditing(false)

			if (active && draft !== originalFormattedRef.current) {
				if (anchorRef.current || extraCellsRef.current.size > 0) applyBulkFill(draft)
				else applyCellWrite(active.row, active.col, draft)
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
			draft,
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
	}, [wrapperRef])

	return { editing, draft, setDraft, beginEdit, commitEdit, cancelEdit }
}
