'use client'

import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useCallback } from 'react'
import { claimedBySurface, editorMove, ownNode, type SessionMove } from './engine/grid-edit-keys'
import type { CellRequest, SessionRow } from './engine/grid-edit-transition'
import {
	EDITOR_FOCUSABLE,
	findCoord,
	type GridActiveEdit,
	isCellEditing,
	isColumnEditable,
	readKeyPress,
	stepEditableColumn,
} from './engine/grid-editing-utilities'
import type { GridRowStep } from './engine/grid-range/range'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/**
 * The session one key press names: its row, and the column of an open editor,
 * or `null` for a column with no open editor. @internal
 */
export type GridSessionTarget = { rowKey: string | number; columnId: string | number | null }

/**
 * Owns the keys of a grid-owned session, layered onto the grid `<table>`'s key
 * handler. Escape abandons the session. From an open editor, Enter commits and
 * moves down, F2 commits and stays, and Tab and Shift+Tab commit and move along
 * the row. Every editor therefore inherits the keys without wiring of its own.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditKeys<T>({
	cellScoped,
	controlled,
	tableRef,
	rowKeysRef,
	dataColumnsRef,
	editableRowsRef,
	activeEditRef,
	sessionRowRef,
	requestRef,
	cellId,
	moveTo,
	rowStep,
	reseat,
	isPending,
	enterEdit,
	endSession,
	newRowKeys,
}: {
	cellScoped: boolean
	controlled: boolean
	/** The grid `<table>`, whose own rows and cells the session reads. */
	tableRef: RefObject<HTMLTableElement | null>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	editableRowsRef: RefObject<Set<string | number>>
	activeEditRef: RefObject<GridActiveEdit | null>
	/** The row the grid-owned session holds. */
	sessionRowRef: RefObject<SessionRow | null>
	/** The move that a controlled binding has yet to apply. */
	requestRef: RefObject<CellRequest | null>
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
	/** The data row a number of rows away, over the rows that the cursor shows. */
	rowStep: GridRowStep
	/** Reseats focus on the tab stop, marked as the grid's own move. */
	reseat: () => void
	/** Whether the cell's commit is in flight. */
	isPending: (rowKey: string | number, columnId: string | number) => boolean
	enterEdit: (rowKey: string | number, columnId: string | number) => void
	endSession: (rowKey: string | number, outcome: 'save' | 'discard') => void
	/** The keys of the new-row slot, which return `true` for a press from the slot. */
	newRowKeys: (event: ReactKeyboardEvent<HTMLTableElement>) => boolean
}) {
	// The session one key press names. The press names its row when it came from
	// inside one, which is what picks the right row while several edit at once.
	// Elsewhere in the grid (the tab stop after a Tab back, a header control)
	// it names none, and the session the grid opened is the one it means. The
	// column comes from the press's cell, and only an open editor's cell names
	// one. Escape reads the row alone; Enter needs the editor. A row or a cell of
	// a grid nested in a detail row names nothing (see `ownNode`).
	const sessionTarget = useCallback(
		(target: Element): GridSessionTarget | null => {
			const table = tableRef.current

			const rowIndex = ownNode(target.closest('tr[data-row-index]'), table)?.getAttribute(
				'data-row-index',
			)

			const rowKey =
				rowIndex === null || rowIndex === undefined
					? sessionRowRef.current?.rowKey
					: rowKeysRef.current[Number(rowIndex)]

			if (rowKey == null || !editableRowsRef.current.has(rowKey)) return null

			const colAttr = ownNode(target.closest('td[data-grid-col]'), table)?.getAttribute(
				'data-grid-col',
			)

			const col = dataColumnsRef.current.find((candidate) => String(candidate.id) === colAttr)

			const open =
				col !== undefined &&
				isColumnEditable(col) &&
				isCellEditing({
					rowKey,
					columnId: col.id,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				})

			return { rowKey, columnId: open ? col.id : null }
		},
		[rowKeysRef, dataColumnsRef, tableRef, sessionRowRef, editableRowsRef, activeEditRef],
	)

	// Enter commits the session and moves the cursor down one row, the next data
	// row that the cursor shows. Under cell scope it enters that row's cell,
	// which is the column-wise fill flow of a spreadsheet. On the last row the
	// cursor stays, and focus rests on the tab stop. The exit and the entry are
	// two writes, so a controlled binding can decline the entry and keep the
	// commit.
	const commitDown = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const rowKeys = rowKeysRef.current

			const { row, col } = findCoord(rowKeys, dataColumnsRef.current, { rowKey, columnId })

			endSession(rowKey, 'save')

			const below = rowStep(row, 1)

			const next = below === undefined ? undefined : rowKeys[below]

			if (below === undefined || next === undefined) {
				moveTo({ row, col })

				return
			}

			moveTo({ row: below, col })

			if (cellScoped) enterEdit(next, columnId)
		},
		[cellScoped, endSession, enterEdit, moveTo, rowStep, rowKeysRef, dataColumnsRef],
	)

	// F2 commits the session and leaves the cursor on the cell, with focus back on
	// the tab stop. It toggles edit off, as F2 on the tab stop toggles it on.
	const commitHere = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const coord = findCoord(rowKeysRef.current, dataColumnsRef.current, { rowKey, columnId })

			endSession(rowKey, 'save')

			moveTo(coord)
		},
		[endSession, moveTo, rowKeysRef, dataColumnsRef],
	)

	// Tab and Shift+Tab move along the row's editable columns, and wrap at the
	// edges. Under cell scope the move re-points the session, so the cell it
	// leaves commits. Under row scope every editor of the row is open, so focus
	// moves and the row commits when it closes. A row with one editable column
	// has nowhere to go, so the key commits there, as F2 does.
	const commitAlong = useCallback(
		(rowKey: string | number, columnId: string | number, step: 1 | -1) => {
			const columns = dataColumnsRef.current

			const { row, col } = findCoord(rowKeysRef.current, columns, { rowKey, columnId })

			// A cell whose commit is in flight cannot open, so the move steps past it.
			const next = stepEditableColumn(columns, col, step, (index) =>
				isPending(rowKey, columns[index]?.id ?? ''),
			)

			const target = columns[next]

			if (next === col || !target) {
				commitHere(rowKey, columnId)

				return
			}

			moveTo({ row, col: next })

			if (!cellScoped) {
				const editor = document
					.getElementById(cellId(row, next))
					?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

				editor?.focus()

				return
			}

			// Blur the editor while it is still mounted, so a value it stages on blur
			// reaches the draft before the sweep commits the cell. A controlled
			// binding can decline the move, so the request marks the blur, and the
			// transition effect does it once the move lands.
			if (!controlled) reseat()

			enterEdit(rowKey, target.id)

			if (requestRef.current) requestRef.current.blur = true
		},
		[
			cellScoped,
			controlled,
			cellId,
			commitHere,
			isPending,
			enterEdit,
			moveTo,
			rowKeysRef,
			dataColumnsRef,
			requestRef,
			reseat,
		],
	)

	// Runs the move a key asked of the session from an open editor.
	const runMove = useCallback(
		(move: SessionMove, rowKey: string | number, columnId: string | number) => {
			if (move === 'down') commitDown(rowKey, columnId)
			else if (move === 'here') commitHere(rowKey, columnId)
			else commitAlong(rowKey, columnId, move === 'previous' ? -1 : 1)
		},
		[commitDown, commitAlong, commitHere],
	)

	// Escape anywhere in an editing grid abandons its session, so it never reads
	// as dead while a draft stands. The move keys act only from an open editor
	// (see `editorMove`). Every key stands down while the press belongs to a
	// floating surface (see `claimedBySurface`) or to an input method. The first
	// press closes that surface, and the next reaches the session.
	const sessionKeys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			// The new-row slot keeps its own keys, and no data session reads them.
			if (claimedBySurface(event) || readKeyPress(event).composing || newRowKeys(event)) return

			const target = event.target as Element

			const move = event.key === 'Escape' ? 'abandon' : editorMove(event)

			const session = move === null ? null : sessionTarget(target)

			if (move === null || session === null) return

			if (move === 'abandon') {
				event.preventDefault()

				endSession(session.rowKey, 'discard')

				return
			}

			if (session.columnId === null) return

			event.preventDefault()

			runMove(move, session.rowKey, session.columnId)
		},
		[endSession, sessionTarget, runMove, newRowKeys],
	)

	return { sessionKeys, sessionTarget }
}
