'use client'

import { type KeyboardEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import { EMPTY_SET } from './grid-constants'
import type { GridEditSession } from './grid-editing-context'
import type { CellChange, GridEditableConfig } from './grid-editing-types'
import { inferEditorKind, isPrintableKey } from './grid-editing-utilities'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/** A keydown handler for the grid `<table>` (the cursor's single tab stop). @internal */
type TableKeyDown = (event: KeyboardEvent<HTMLTableElement>) => void

/**
 * The per-row editing layer's surface, consumed by {@link GridData}: the
 * controllable editable-row set, the cell currently under edit, the live
 * {@link GridEditSession} for the mounted editor, and the helpers the augmented
 * columns and the grid `<table>` wire up (begin-edit, the editability test, and
 * the cursor key handler that layers begin-on-Enter/-type over navigation).
 *
 * @internal
 */
export type GridEditingApi = {
	editingCoord: Coord | null
	session: GridEditSession
	/** Whether the cell at the display coord can enter edit mode (its row is editable and the column binds an editor). */
	isCellEditable: (rowIdx: number, colIdx: number) => boolean
	/** Opens the editor on a cell; `initial` seeds the draft (a typed character) instead of the cell's current value. */
	beginEdit: (coord: Coord, initial?: string) => void
	/** Wraps the navigation key handler: Enter / F2 (or typing into a text cell) opens the editor on the active editable cell, else navigation runs. */
	onTableKeyDown: TableKeyDown
}

/** The outcome of resolving an open edit's commit against its column. @internal */
type CommitResolution =
	| { kind: 'close' }
	| { kind: 'reject'; message: string }
	| { kind: 'emit'; change: CellChange }

/**
 * Resolves a pending commit: locates the editing cell, diffs the draft against
 * the row's current value, runs the column's {@link GridColumn.validate}, and
 * returns whether to close silently, reject (keep the editor open with a
 * message), or emit a {@link CellChange}. Module-level so {@link useGridEditing}'s
 * `commit` stays within its complexity budget.
 *
 * @internal
 */
function resolveCommit<T>(args: {
	coord: Coord
	draft: unknown
	dataColumns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
}): CommitResolution {
	const col = args.dataColumns[args.coord.col]

	const row = args.rows[args.coord.row]

	const rowKey = args.rowKeys[args.coord.row]

	if (!col || row == null || rowKey == null) return { kind: 'close' }

	const original = col.field != null ? row[col.field] : undefined

	if (Object.is(args.draft, original)) return { kind: 'close' }

	const message = col.validate?.(args.draft, row)

	if (message != null) return { kind: 'reject', message }

	return { kind: 'emit', change: { rowKey, columnId: col.id, value: args.draft } }
}

/**
 * Owns per-row inline editing layered over the read-only cursor: the editable
 * rows (a controllable `Set<key>`, driven entirely by the consumer), the open
 * edit's coord and typed draft, and the commit/cancel lifecycle (with per-column
 * `validate`). Bounds and the active cell resolve from refs at event time, so the
 * returned callbacks stay referentially stable and the memoized rows hold across
 * edits. Inert when `enabled` is false — `onTableKeyDown` is the bare navigation
 * handler and no cell reports editable — so a read-only grid pays nothing.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditing<T>({
	enabled,
	config,
	active,
	moveTo,
	navKeyDown,
	rowsRef,
	rowKeysRef,
	dataColumnsRef,
	tableRef,
}: {
	enabled: boolean
	config: GridEditableConfig | undefined
	/** The cursor's active cell (from {@link useGridNavigation}); mirrored to a ref for event-time reads. */
	active: Coord | null
	moveTo: (coord: Coord) => void
	/** The navigation cursor's own keydown handler, wrapped by {@link GridEditingApi.onTableKeyDown}. */
	navKeyDown: TableKeyDown | undefined
	rowsRef: RefObject<T[]>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order — the cursor's column index space. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	tableRef: RefObject<HTMLTableElement | null>
}): GridEditingApi {
	// The editable-row set is consumer-owned: the grid renders no built-in edit
	// trigger, so it only reads the binding (a row-action button flips a key).
	const [editableRowsRaw] = useControllable<Set<string | number>>({
		value: config?.rows,
		defaultValue: config?.defaultRows ?? EMPTY_SET,
		onValueChange: (next) => config?.onRowsChange?.(next ?? EMPTY_SET),
	})

	const editableRows = editableRowsRaw ?? EMPTY_SET

	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeRef = useRef(active)

	activeRef.current = active

	const onValueChangeRef = useRef(config?.onValueChange)

	onValueChangeRef.current = config?.onValueChange

	// The open edit's cell (begin/end only) and its typed draft (per keystroke),
	// mirrored to refs so the commit reads the latest values even when blur fires
	// in the same tick as the last change.
	const [editingCoord, setEditingCoord] = useState<Coord | null>(null)

	const editingCoordRef = useRef<Coord | null>(null)

	editingCoordRef.current = editingCoord

	// The pending value lives only in this ref (read at commit); the mounted editor
	// owns the live display value, so typing never re-renders the grid.
	const draftRef = useRef<unknown>(undefined)

	const [error, setError] = useState<string | null>(null)

	// One commit per session: the explicit Enter/Escape close guards the trailing
	// blur from committing (or cancelling) a second time.
	const sessionClosedRef = useRef(true)

	const isCellEditable = useCallback(
		(rowIdx: number, colIdx: number): boolean => {
			const rowKey = rowKeysRef.current[rowIdx]

			const col = dataColumnsRef.current[colIdx]

			if (rowKey == null || !col || col.readOnly) return false

			if (!editableRowsRef.current.has(rowKey)) return false

			return col.field != null || col.editCell != null
		},
		[rowKeysRef, dataColumnsRef],
	)

	const onValueUpdate = useCallback((next: unknown) => {
		draftRef.current = next
	}, [])

	const beginEdit = useCallback(
		(coord: Coord, initial?: string) => {
			if (!isCellEditable(coord.row, coord.col)) return

			const col = dataColumnsRef.current[coord.col]

			const row = rowsRef.current[coord.row]

			if (!col || row == null) return

			const current = col.field != null ? row[col.field] : undefined

			const seed = initial !== undefined ? initial : current

			sessionClosedRef.current = false

			draftRef.current = seed

			setError(null)

			moveTo(coord)

			setEditingCoord(coord)
		},
		[isCellEditable, dataColumnsRef, rowsRef, moveTo],
	)

	const closeSession = useCallback(() => {
		sessionClosedRef.current = true

		setEditingCoord(null)

		setError(null)

		tableRef.current?.focus()
	}, [tableRef])

	const commit = useCallback(() => {
		const coord = editingCoordRef.current

		if (!coord || sessionClosedRef.current) return

		const resolution = resolveCommit({
			coord,
			draft: draftRef.current,
			dataColumns: dataColumnsRef.current,
			rows: rowsRef.current,
			rowKeys: rowKeysRef.current,
		})

		if (resolution.kind === 'reject') {
			setError(resolution.message)

			return
		}

		closeSession()

		if (resolution.kind === 'emit') onValueChangeRef.current?.([resolution.change])
	}, [dataColumnsRef, rowsRef, rowKeysRef, closeSession])

	const cancel = useCallback(() => {
		closeSession()
	}, [closeSession])

	// Drop an open edit whose row leaves the editable set (the consumer toggled the
	// row out from under it).
	useEffect(() => {
		if (!editingCoord) return

		const rowKey = rowKeysRef.current[editingCoord.row]

		if (rowKey == null || !editableRows.has(rowKey)) {
			sessionClosedRef.current = true

			setEditingCoord(null)

			setError(null)
		}
	}, [editableRows, editingCoord, rowKeysRef])

	// Enter / F2 opens the editor seeded from the cell value; typing a printable
	// character opens a text cell seeded with it. Returns whether it handled the
	// key, so the caller falls through to navigation otherwise.
	const tryBeginFromKey = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, cursor: Coord): boolean => {
			if (event.key === 'Enter' || event.key === 'F2') {
				event.preventDefault()

				beginEdit(cursor)

				return true
			}

			if (!isPrintableKey(event)) return false

			const col = dataColumnsRef.current[cursor.col]

			const row = rowsRef.current[cursor.row]

			const value = col?.field != null && row != null ? row[col.field] : undefined

			if (inferEditorKind(value) !== 'text') return false

			event.preventDefault()

			beginEdit(cursor, event.key)

			return true
		},
		[beginEdit, dataColumnsRef, rowsRef],
	)

	const onTableKeyDown = useCallback<TableKeyDown>(
		(event) => {
			// While an edit is open the mounted editor owns the keyboard (arrows move
			// the text caret, Enter/Escape commit/cancel); navigation stands down.
			if (editingCoordRef.current) return

			const cursor = activeRef.current

			if (cursor && isCellEditable(cursor.row, cursor.col) && tryBeginFromKey(event, cursor)) return

			navKeyDown?.(event)
		},
		[isCellEditable, tryBeginFromKey, navKeyDown],
	)

	const session: GridEditSession = {
		initialDraft: draftRef.current,
		error,
		onValueUpdate,
		commit,
		cancel,
	}

	return {
		editingCoord: enabled ? editingCoord : null,
		session,
		isCellEditable,
		beginEdit,
		onTableKeyDown: enabled && navKeyDown ? onTableKeyDown : (navKeyDown ?? (() => {})),
	}
}
