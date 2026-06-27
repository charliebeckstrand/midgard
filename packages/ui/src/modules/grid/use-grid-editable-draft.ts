'use client'

import { type RefObject, type SetStateAction, useCallback, useRef, useState } from 'react'
import type {
	Coord,
	GridEditableColumn,
	GridEditableDraftApi,
	GridEditableMutationsApi,
	GridEditableNavigationApi,
	GridEditableRowsApi,
} from './grid-editable-types'

/**
 * Validates the active cell's pending commit: parses the draft and runs the
 * column's {@link GridEditableColumn.validate}, returning its message (reject) or
 * `null` (accept, or no validator / read-only / missing row). Kept module-level
 * so {@link useGridEditableDraft}'s `commitEdit` stays within its complexity
 * budget.
 *
 * @internal
 */
function validateCommit<T>(args: {
	active: Coord
	committed: string
	editableCols: GridEditableColumn<T>[]
	rowsRef: RefObject<T[]>
	parseValue: (raw: string, row: T, col: GridEditableColumn<T>) => unknown
}): string | null {
	const col = args.editableCols[args.active.col]

	const row = args.rowsRef.current[args.active.row]

	if (!col?.validate || !row || col.readOnly) return null

	return col.validate(args.parseValue(args.committed, row, col), row)
}

/**
 * Writes the committed draft: a multi-cell selection (anchor rectangle or
 * ctrl-clicked extras) fans out through `applyBulkFill`, otherwise the active
 * cell writes through `applyCellWrite`. Module-level to keep `commitEdit` within
 * its complexity budget.
 *
 * @internal
 */
function applyCommit(args: {
	active: Coord
	committed: string
	anchorRef: GridEditableNavigationApi['anchorRef']
	extraCellsRef: GridEditableNavigationApi['extraCellsRef']
	applyBulkFill: GridEditableMutationsApi['applyBulkFill']
	applyCellWrite: GridEditableMutationsApi['applyCellWrite']
}): void {
	if (args.anchorRef.current || args.extraCellsRef.current.size > 0) {
		args.applyBulkFill(args.committed)

		return
	}

	args.applyCellWrite(args.active.row, args.active.col, args.committed)
}

/**
 * Moves the cursor after a successful commit: `down` steps a row, `right`/`left`
 * tab between cells, `none` holds. Returns whether the cursor stayed in the grid
 * (a tab can exit it). Module-level to keep `commitEdit` within its complexity
 * budget.
 *
 * @internal
 */
function advanceCursor(
	advance: 'down' | 'right' | 'left' | 'none',
	moveActive: GridEditableNavigationApi['moveActive'],
	moveActiveTab: GridEditableNavigationApi['moveActiveTab'],
): boolean {
	if (advance === 'down') {
		moveActive(1, 0)

		return true
	}

	if (advance === 'right') return moveActiveTab(1)

	if (advance === 'left') return moveActiveTab(-1)

	return true
}

/**
 * Owns the lifecycle of an in-progress cell edit: the draft buffer, the
 * once-per-session commit guard, and the lossy-format diff baseline. Routes
 * commits through `applyBulkFill` when a multi-cell selection is active and
 * through `applyCellWrite` otherwise, then advances the cursor.
 *
 * @internal
 */
export function useGridEditableDraft<T>({
	nav: { active, anchorRef, extraCellsRef, moveActive, moveActiveTab, setActive },
	mutations: { applyCellWrite, applyBulkFill },
	rows: { editableCols, rowsRef, parseValue },
	wrapperRef,
}: {
	nav: GridEditableNavigationApi
	mutations: GridEditableMutationsApi
	rows: GridEditableRowsApi<T>
	wrapperRef: RefObject<HTMLTableElement | null>
}): GridEditableDraftApi {
	const [editing, setEditing] = useState(false)

	const [draft, setDraftState] = useState('')

	// Validation message for the open edit; a rejected commit sets it and keeps
	// the editor open. Cleared when a new edit begins, on cancel, and on a
	// successful commit.
	const [error, setError] = useState<string | null>(null)

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

			setError(null)

			setEditing(true)
		},
		[editableCols, setActive, setDraft],
	)

	const commitEdit = useCallback(
		(advance: 'down' | 'right' | 'left' | 'none') => {
			if (sessionClosedRef.current) return true

			// Read the live draft, not the closure's: blur can fire before the last
			// keystroke's re-render refreshes this callback.
			const committed = draftRef.current

			const changed = active != null && committed !== originalFormattedRef.current

			// Validate the active cell before closing. A rejected commit keeps the
			// editor open with the message and advances nowhere. Bulk fills aren't
			// validated here (paste/range have no single editing cell).
			if (changed && active) {
				const message = validateCommit({ active, committed, editableCols, rowsRef, parseValue })

				if (message) {
					setError(message)

					return false
				}
			}

			sessionClosedRef.current = true

			setEditing(false)

			setError(null)

			if (changed && active) {
				applyCommit({ active, committed, anchorRef, extraCellsRef, applyBulkFill, applyCellWrite })
			}

			const stayedInGrid = advanceCursor(advance, moveActive, moveActiveTab)

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
			editableCols,
			rowsRef,
			parseValue,
		],
	)

	const cancelEdit = useCallback(() => {
		sessionClosedRef.current = true

		setEditing(false)

		setError(null)

		setDraft('')

		wrapperRef.current?.focus()
	}, [wrapperRef, setDraft])

	return { editing, draft, error, setDraft, beginEdit, commitEdit, cancelEdit }
}
