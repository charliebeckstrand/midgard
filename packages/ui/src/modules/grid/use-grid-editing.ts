'use client'

import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { EMPTY_SET } from './grid-constants'
import type { GridRowEditing } from './grid-editing-context'
import type { CellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/** The per-row editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	rowEditing: GridRowEditing
	/**
	 * Puts a row into edit mode through the controllable set (so `onRowsChange`
	 * fires) and, once its editors mount, focuses the editor in the cell at
	 * `coord` — the grid-owned entry behind `trigger: 'doubleClick'`. A no-op for
	 * a row already editing.
	 */
	enterRowEdit: (rowKey: string | number, coord: Coord) => void
}

/** Focusable editor content inside an editing cell, in preference order. @internal */
const EDITOR_FOCUSABLE = 'input, select, textarea, button, [tabindex]'

/**
 * Reseats focus on the grid's single tab stop when it currently sits inside the
 * grid — called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @internal
 */
function restoreGridFocus(): void {
	const active = document.activeElement

	if (active instanceof HTMLElement) active.closest<HTMLElement>('[role="grid"]')?.focus()
}

/** A row's staged cell values, keyed by column id. @internal */
type RowDrafts = Map<string | number, unknown>

/**
 * Resolves a row's staged drafts into committed {@link CellChange}s: keeps each
 * changed cell (its draft differs from the row's current value) that passes the
 * column's {@link GridColumn.validate}, dropping unchanged and invalid ones.
 * Module-level so the flush effect stays within its complexity budget.
 *
 * @internal
 */
function flushRow<T>(args: {
	rowKey: string | number
	drafts: RowDrafts
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
}): CellChange[] {
	const rowIdx = args.rowKeys.indexOf(args.rowKey)

	const row = args.rows[rowIdx]

	if (row == null) return []

	const changes: CellChange[] = []

	for (const col of args.columns) {
		if (!args.drafts.has(col.id)) continue

		const value = args.drafts.get(col.id)

		const original = col.field != null ? row[col.field] : undefined

		if (Object.is(value, original)) continue

		if (col.validate?.(value, row) != null) continue

		changes.push({ rowKey: args.rowKey, columnId: col.id, value })
	}

	return changes
}

/**
 * Flushes every row that left the editable set since the last render: emits its
 * staged changes as one `onValueChange` batch, clears its drafts, and returns the
 * total cells saved across them (for the commit announcement). @internal
 */
function flushExitedRows<T>(args: {
	prev: Set<string | number>
	next: Set<string | number>
	drafts: Map<string | number, RowDrafts>
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onValueChange: ((changes: CellChange[]) => void) | undefined
}): number {
	let saved = 0

	for (const rowKey of args.prev) {
		if (args.next.has(rowKey)) continue

		const drafts = args.drafts.get(rowKey)

		args.drafts.delete(rowKey)

		if (!drafts || drafts.size === 0) continue

		const changes = flushRow({
			rowKey,
			drafts,
			columns: args.columns,
			rows: args.rows,
			rowKeys: args.rowKeys,
		})

		if (!changes.length) continue

		args.onValueChange?.(changes)

		saved += changes.length
	}

	return saved
}

/**
 * Owns per-row inline editing: the editable rows (a controllable `Set<key>`,
 * consumer-driven by default) and the staged drafts of cells in those rows. A
 * row in the set renders all its editable cells as editors at once; each edit
 * stages into a grid-held ref (no per-keystroke grid render). When a row leaves
 * the set — the consumer's save action, or a grid-owned session exit under
 * `trigger: 'doubleClick'` (an editor's Enter saves, Escape abandons) — its
 * drafts flush as a single {@link CellChange} batch through `onValueChange`,
 * dropping unchanged and invalid cells. Inert when `enabled` is false, so a
 * read-only grid pays nothing.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditing<T>({
	enabled,
	config,
	rowsRef,
	rowKeysRef,
	dataColumnsRef,
	cellId,
}: {
	enabled: boolean
	config: GridEditableConfig | undefined
	rowsRef: RefObject<T[]>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The cursor's per-cell id deriver; locates the entered cell's editor to focus it. */
	cellId: (row: number, col: number) => string
}): GridEditingApi {
	// The editable-row set is consumer-driven by default — the grid renders no
	// built-in trigger and only reads the binding (a row-action button flips a
	// key). Under `trigger: 'doubleClick'` the grid also writes it, through the
	// session callbacks below, so every entry/exit still emits `onRowsChange`.
	const [editableRowsRaw, setEditableRows] = useControllable<Set<string | number>>({
		value: config?.rows,
		defaultValue: config?.defaultRows ?? EMPTY_SET,
		onValueChange: (next) => config?.onRowsChange?.(next ?? EMPTY_SET),
	})

	const editableRows = enabled ? (editableRowsRaw ?? EMPTY_SET) : EMPTY_SET

	// Grid-owned session lifecycle (enter on double-click / cursor Enter, exit on
	// an editor's Enter/Escape); the default 'manual' mode leaves it entirely to
	// the consumer.
	const sessionOwned = enabled && config?.trigger === 'doubleClick'

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const onValueChangeRef = useRef(config?.onValueChange)

	onValueChangeRef.current = config?.onValueChange

	// Staged drafts per editing row, keyed rowKey → (columnId → value). Held in a
	// ref so staging never re-renders the grid; read at flush time.
	const draftsRef = useRef<Map<string | number, RowDrafts>>(new Map())

	const stageDraft = useCallback(
		(rowKey: string | number, columnId: string | number, value: unknown) => {
			let row = draftsRef.current.get(rowKey)

			if (!row) {
				row = new Map()

				draftsRef.current.set(rowKey, row)
			}

			row.set(columnId, value)
		},
		[],
	)

	const unstageDraft = useCallback((rowKey: string | number, columnId: string | number) => {
		draftsRef.current.get(rowKey)?.delete(columnId)
	}, [])

	// The cell whose editor takes focus once its row's editors mount — set by
	// `enterRowEdit`, resolved by the effect below after the render that mounts
	// them (the controlled binding may take an extra consumer round-trip).
	const pendingFocusRef = useRef<{ rowKey: string | number; coord: Coord } | null>(null)

	const enterRowEdit = useCallback(
		(rowKey: string | number, coord: Coord) => {
			if (editableRowsRef.current.has(rowKey)) return

			pendingFocusRef.current = { rowKey, coord }

			setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))
		},
		[setEditableRows],
	)

	// Focus the entered cell's editor once the editable set carries its row —
	// after the editors mount. A set change that doesn't include the pending row
	// (a controlled consumer declined the entry) drops the intent instead of
	// letting it steal focus on a later, unrelated edit.
	useEffect(() => {
		const pending = pendingFocusRef.current

		if (!pending) return

		pendingFocusRef.current = null

		if (!editableRows.has(pending.rowKey)) return

		document
			.getElementById(cellId(pending.coord.row, pending.coord.col))
			?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)
			?.focus()
	}, [editableRows, cellId])

	// Grid-owned exits: both reseat focus on the grid's tab stop before the
	// editors unmount, then remove the row from the set — the same flush path a
	// consumer save takes. Cancel drops the row's drafts first, so the flush
	// finds nothing to emit.
	const exitRowEdit = useCallback(
		(rowKey: string | number) => {
			if (!editableRowsRef.current.has(rowKey)) return

			restoreGridFocus()

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[setEditableRows],
	)

	const cancelRowEdit = useCallback(
		(rowKey: string | number) => {
			draftsRef.current.delete(rowKey)

			exitRowEdit(rowKey)
		},
		[exitRowEdit],
	)

	// Flush rows that left the editable set since the last render: emit their
	// staged changes as one batch and clear the drafts. The editors for those rows
	// have unmounted, but the drafts persist in the ref until flushed here.
	const prevRowsRef = useRef<Set<string | number>>(EMPTY_SET)

	useEffect(() => {
		const prev = prevRowsRef.current

		prevRowsRef.current = editableRows

		const saved = flushExitedRows({
			prev,
			next: editableRows,
			drafts: draftsRef.current,
			columns: dataColumnsRef.current,
			rows: rowsRef.current,
			rowKeys: rowKeysRef.current,
			onValueChange: onValueChangeRef.current,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3).
		if (saved > 0) announce(`${saved} ${saved === 1 ? 'cell' : 'cells'} updated`)
	}, [editableRows, dataColumnsRef, rowsRef, rowKeysRef])

	const rowEditing = useMemo<GridRowEditing>(
		() => ({
			editableRows,
			stageDraft,
			unstageDraft,
			commitRowEdit: sessionOwned ? exitRowEdit : undefined,
			cancelRowEdit: sessionOwned ? cancelRowEdit : undefined,
		}),
		[editableRows, stageDraft, unstageDraft, sessionOwned, exitRowEdit, cancelRowEdit],
	)

	return { rowEditing, enterRowEdit }
}
