'use client'

import { type FocusEvent as ReactFocusEvent, type RefObject, useCallback, useRef } from 'react'
import { type PendingLeave, readLeave } from './engine/grid-edit-leave'
import type { SessionRow } from './engine/grid-edit-transition'
import { inGrid } from './engine/grid-editing-utilities'
import type { GridSessionTarget } from './use-grid-edit-keys'
import type { CommitOn } from './use-grid-editing-warnings'

/**
 * Owns the commit on leave of a grid-owned session, layered onto the grid
 * `<table>`'s focus handlers. `blur` reads each focus move out of an editor,
 * or out of the grid, against `commitOn`, and commits the session when the
 * move leaves what that policy watches. `focus` tells a surface that the grid
 * renders from an unrelated element, through the React tree.
 *
 * @internal
 */
export function useGridEditLeave({
	commitOn,
	reseatingRef,
	editableRowsRef,
	sessionRowRef,
	sessionTarget,
	exitSession,
}: {
	commitOn: CommitOn
	/** Set while the grid moves focus itself. */
	reseatingRef: RefObject<boolean>
	editableRowsRef: RefObject<Set<string | number>>
	/** The row the grid-owned session holds. */
	sessionRowRef: RefObject<SessionRow | null>
	/** The session that an element of the grid names (see `useGridEditKeys`). */
	sessionTarget: (target: Element) => GridSessionTarget | null
	exitSession: (rowKey: string | number, outcome: 'save' | 'discard', reseatFocus: boolean) => void
}) {
	// The row a focus move out of `from` would commit: the editing row that
	// `from` sits in, else the row the grid-owned session holds. A move from a
	// row that is not editing, or from a surface outside the table's DOM, names
	// the held row.
	const leaveRow = useCallback(
		(from: Element, grid: HTMLElement): string | number | null => {
			const hit = grid.contains(from) ? sessionTarget(from) : null

			if (hit) return hit.rowKey

			const held = sessionRowRef.current?.rowKey

			return held != null && editableRowsRef.current.has(held) ? held : null
		},
		[sessionTarget, sessionRowRef, editableRowsRef],
	)

	// A focus move out of the table's DOM, while its focus event is due.
	const pendingLeaveRef = useRef<PendingLeave | null>(null)

	// Settles a pending leave once its focus event has run. A surface that the
	// grid renders owns the move, and the session stays. Anything else leaves.
	const settleLeave = useCallback(
		(pending: PendingLeave) => {
			if (pendingLeaveRef.current !== pending) return

			pendingLeaveRef.current = null

			if (!pending.owned) exitSession(pending.rowKey, 'save', false)
		},
		[exitSession],
	)

	// Commits the session when focus leaves what `commitOn` watches (see
	// `readLeave`). The commit is the commit of Enter, without the cursor move
	// and without the focus reseat: focus stays where the user sent it. The
	// grid's own reseat is not a leave. Under `'leaveEditor'`, the editors of the
	// row are the open editors of the committed row, which is only the held
	// cell under cell scope. The settle controls sit in that cell.
	//
	// A move to an element outside the table's DOM waits for its `focusin`. The
	// browser fires `focusin` in the same task, after this `focusout`. React
	// gives it to the table's `onFocus` from its own listener on the root or on
	// the portal container, below the document. A one-time `focusin` listener
	// on the document therefore runs after that `onFocus`, and settles the move.
	// A microtask is not reliable. After a click, the browser runs microtasks
	// between the two events.
	const blur = useCallback(
		(event: ReactFocusEvent<HTMLTableElement>) => {
			if (reseatingRef.current || commitOn === 'explicit') return

			const from = event.target

			const grid = event.currentTarget

			const rowKey = leaveRow(from, grid)

			if (rowKey === null) return

			const inEditors = (node: Element) => {
				const hit = inGrid(node, grid) ? sessionTarget(node) : null

				return hit !== null && hit.rowKey === rowKey && hit.columnId !== null
			}

			const next = event.relatedTarget instanceof Element ? event.relatedTarget : null

			const verdict = readLeave({ commitOn, grid, from, next, inEditors })

			if (verdict === 'leave') exitSession(rowKey, 'save', false)

			if (verdict !== 'ask' || next === null) return

			const pending: PendingLeave = { next, rowKey, owned: false }

			pendingLeaveRef.current = pending

			document.addEventListener('focusin', () => settleLeave(pending), { once: true })
		},
		[commitOn, reseatingRef, leaveRow, sessionTarget, exitSession, settleLeave],
	)

	// Marks a pending leave as owned when its focus event reaches the table
	// through the React tree. Only a surface that the grid renders does that.
	const focus = useCallback((event: ReactFocusEvent<HTMLTableElement>) => {
		const pending = pendingLeaveRef.current

		if (pending && event.target === pending.next) pending.owned = true
	}, [])

	return { blur, focus }
}
