'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { EMPTY_SET } from './engine/grid-constants'
import type { GridActiveEdit, GridRowEditing } from './grid-editing-context'
import type { CellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/** The per-row editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	rowEditing: GridRowEditing
	/**
	 * Puts a row into edit mode through the controllable set (so `onRowsChange`
	 * fires) and, once its editors mount, focuses the editor in the cell at
	 * `coord` — the grid-owned entry behind `trigger: 'doubleClick'`. Under row
	 * scope it is a no-op for a row already editing. Under `scope: 'cell'` it
	 * re-points the session at `columnId` instead: the cell it leaves commits,
	 * and a previous row leaves the set.
	 */
	enterRowEdit: (rowKey: string | number, columnId: string | number, coord: Coord) => void
	/**
	 * Abandons an editing row's session when an Escape bubbles up from one of its
	 * editors — layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor}, so every editor (inferred input, listbox, `editCell`
	 * slot) inherits it without wiring of its own. `undefined` unless the grid
	 * owns the session (`trigger: 'doubleClick'`).
	 */
	sessionEscape: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
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
 * staged changes as one `onCommit` batch, clears its drafts, and returns the
 * total cells saved across them (for the commit announcement). @internal
 */
function flushExitedRows<T>(args: {
	prev: Set<string | number>
	next: Set<string | number>
	drafts: Map<string | number, RowDrafts>
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onCommit: ((changes: CellChange[]) => void) | undefined
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

		args.onCommit?.(changes)

		saved += changes.length
	}

	return saved
}

/**
 * Flushes the single cell a cell-scoped session left while its row stayed in the
 * editable set — the move from one cell of a row to another. Emits that cell's
 * change as its own `onCommit` batch and drops the draft, so the row's later exit
 * finds nothing to re-emit and every cell-scoped commit carries one change.
 * Returns the cells saved (0 or 1). @internal
 */
function flushLeftCell<T>(args: {
	cell: GridActiveEdit
	drafts: Map<string | number, RowDrafts>
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onCommit: ((changes: CellChange[]) => void) | undefined
}): number {
	const rowDrafts = args.drafts.get(args.cell.rowKey)

	if (!rowDrafts?.has(args.cell.columnId)) return 0

	const one: RowDrafts = new Map([[args.cell.columnId, rowDrafts.get(args.cell.columnId)]])

	rowDrafts.delete(args.cell.columnId)

	const changes = flushRow({
		rowKey: args.cell.rowKey,
		drafts: one,
		columns: args.columns,
		rows: args.rows,
		rowKeys: args.rowKeys,
	})

	if (!changes.length) return 0

	args.onCommit?.(changes)

	return changes.length
}

/** Whether two active-edit coords name the same cell. @internal */
function isSameCell(a: GridActiveEdit | null, b: GridActiveEdit | null): boolean {
	if (a === null || b === null) return a === b

	return a.rowKey === b.rowKey && a.columnId === b.columnId
}

/**
 * Owns per-row inline editing: the editable rows (a controllable `Set<key>`,
 * consumer-driven by default) and the staged drafts of cells in those rows. A
 * row in the set renders all its editable cells as editors at once; each edit
 * stages into a grid-held ref (no per-keystroke grid render). When a row leaves
 * the set — the consumer's save action, or a grid-owned session exit under
 * `trigger: 'doubleClick'` (an editor's Enter saves, Escape abandons) — its
 * drafts flush as a single {@link CellChange} batch through `onCommit`,
 * dropping unchanged and invalid cells. Inert when `enabled` is false, so a
 * read-only grid pays nothing.
 *
 * A grid-owned session under `scope: 'cell'` narrows to one cell: the row still
 * enters the set, but only the active cell mounts an editor, and the session
 * re-points as the user enters another cell — flushing the cell it leaves, so
 * each batch carries one change.
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

	// Cell scope narrows a grid-owned session to the entered cell. It needs that
	// session: under 'manual' the consumer names a row and never a cell, so there
	// is no cell to narrow to and the row's editors all mount.
	const cellScoped = sessionOwned && config?.scope === 'cell'

	// The cell a cell-scoped session edits; null under row scope. Held as state
	// because it gates which cell mounts an editor.
	const [activeEditRaw, setActiveEdit] = useState<GridActiveEdit | null>(null)

	// A controlled binding can decline an entry (the row never joins the set), and
	// a consumer save can drop an editing row from under the session. Deriving the
	// live coord from the set covers both without an effect to resynchronize.
	const activeEdit = activeEditRaw && editableRows.has(activeEditRaw.rowKey) ? activeEditRaw : null

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeEditRef = useRef(activeEdit)

	activeEditRef.current = activeEdit

	const cellScopedRef = useRef(cellScoped)

	cellScopedRef.current = cellScoped

	const onCommitRef = useRef(config?.onCommit)

	onCommitRef.current = config?.onCommit

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
	const pendingFocusRef = useRef<(GridActiveEdit & { coord: Coord }) | null>(null)

	const enterRowEdit = useCallback(
		(rowKey: string | number, columnId: string | number, coord: Coord) => {
			const active = activeEditRef.current

			// Row scope holds one session per row, so a row already editing takes no
			// second entry; cell scope re-points at the entered cell instead, and only
			// the cell it already sits on is the no-op.
			if (cellScopedRef.current) {
				if (isSameCell(active, { rowKey, columnId })) return
			} else if (editableRowsRef.current.has(rowKey)) return

			pendingFocusRef.current = { rowKey, columnId, coord }

			if (cellScopedRef.current) setActiveEdit({ rowKey, columnId })

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				// A cell-scoped session holds one row at a time: the row it leaves exits
				// the set, flushing whatever the session staged there.
				if (cellScopedRef.current && active && active.rowKey !== rowKey) {
					next.delete(active.rowKey)
				}

				return next.add(rowKey)
			})
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

		// A cell-scoped session mounts one editor, so the focus waits until the
		// session points at the entered cell — never at the cell it left.
		if (activeEdit !== null && !isSameCell(activeEdit, pending)) return

		const editor = document
			.getElementById(cellId(pending.coord.row, pending.coord.col))
			?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		// The editor sits inside its cell's truncation span; focusing it here fires a
		// `focusin` that arms that span. This effect runs during React's commit, where
		// the arm's synchronous `flushSync` cannot flush and warns — route the focus
		// through the helper so the arm takes its no-flush path.
		if (editor) focusWithoutReveal(editor)
	}, [editableRows, activeEdit, cellId])

	// Grid-owned exits: both reseat focus on the grid's tab stop before the
	// editors unmount, then remove the row from the set — the same flush path a
	// consumer save takes. Cancel drops the row's drafts first, so the flush
	// finds nothing to emit.
	const exitRowEdit = useCallback(
		(rowKey: string | number) => {
			if (!editableRowsRef.current.has(rowKey)) return

			restoreGridFocus()

			if (activeEditRef.current?.rowKey === rowKey) setActiveEdit(null)

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
			if (!editableRowsRef.current.has(rowKey)) return

			// Reseat focus before the drafts go, not after: an editor blurred on the
			// way out can stage one last value (`NumberInput` commits its typed text
			// there), and that write must not outlive the discard. `exitRowEdit`
			// reseats again, which lands on the tab stop it already holds.
			restoreGridFocus()

			const active = activeEditRef.current

			// A cell-scoped session abandons the cell it sits on; the cells it visited
			// before that one committed as it left them, so their values are not the
			// session's to discard. Row scope drops the whole row's drafts.
			if (active?.rowKey === rowKey) {
				draftsRef.current.get(rowKey)?.delete(active.columnId)
			} else {
				draftsRef.current.delete(rowKey)
			}

			exitRowEdit(rowKey)
		},
		[exitRowEdit],
	)

	// Escape from any of an editing row's editors abandons its session. It stands
	// down while the press belongs to an inner floating surface, whose
	// document-level escape layer runs *after* this React handler: a press
	// already consumed (`defaultPrevented`), one fired from focus inside a
	// portaled panel (an open listbox's options, the date picker's calendar), or
	// one on an open disclosure's own trigger/input (`aria-expanded="true"`, a
	// combobox typing with its panel open) — each closes that surface instead,
	// and the next press abandons. The row resolves from the event's `<tr>`
	// (`data-row-index` into the display order), so only an editing row's Escape
	// is consumed and every other press keeps bubbling.
	const sessionEscape = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.key !== 'Escape' || event.defaultPrevented) return

			if (!(event.target instanceof Element)) return

			if (event.target.closest('[data-floating-ui-portal]')) return

			if (event.target.closest('[aria-expanded="true"]')) return

			const rowIndex = event.target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

			if (rowIndex == null) return

			const rowKey = rowKeysRef.current[Number(rowIndex)]

			if (rowKey === undefined || !editableRowsRef.current.has(rowKey)) return

			event.preventDefault()

			cancelRowEdit(rowKey)
		},
		[cancelRowEdit, rowKeysRef],
	)

	// Flush rows that left the editable set since the last render: emit their
	// staged changes as one batch and clear the drafts. The editors for those rows
	// have unmounted, but the drafts persist in the ref until flushed here.
	const prevRowsRef = useRef<Set<string | number>>(EMPTY_SET)

	const prevActiveRef = useRef<GridActiveEdit | null>(null)

	useEffect(() => {
		const prev = prevRowsRef.current

		const prevActive = prevActiveRef.current

		prevRowsRef.current = editableRows

		prevActiveRef.current = activeEdit

		let saved = 0

		// A cell-scoped session that moved to another cell of the same row commits
		// the cell it left. A move that also left the row needs nothing here: the
		// row-exit flush below finds the same drafts and emits them.
		if (prevActive && !isSameCell(prevActive, activeEdit) && editableRows.has(prevActive.rowKey)) {
			saved += flushLeftCell({
				cell: prevActive,
				drafts: draftsRef.current,
				columns: dataColumnsRef.current,
				rows: rowsRef.current,
				rowKeys: rowKeysRef.current,
				onCommit: onCommitRef.current,
			})
		}

		saved += flushExitedRows({
			prev,
			next: editableRows,
			drafts: draftsRef.current,
			columns: dataColumnsRef.current,
			rows: rowsRef.current,
			rowKeys: rowKeysRef.current,
			onCommit: onCommitRef.current,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3).
		if (saved > 0) announce(`${saved} ${saved === 1 ? 'cell' : 'cells'} updated`)
	}, [editableRows, activeEdit, dataColumnsRef, rowsRef, rowKeysRef])

	const rowEditing = useMemo<GridRowEditing>(
		() => ({
			editableRows,
			activeEdit,
			stageDraft,
			unstageDraft,
			commitRowEdit: sessionOwned ? exitRowEdit : undefined,
			cancelRowEdit: sessionOwned ? cancelRowEdit : undefined,
		}),
		[editableRows, activeEdit, stageDraft, unstageDraft, sessionOwned, exitRowEdit, cancelRowEdit],
	)

	return { rowEditing, enterRowEdit, sessionEscape: sessionOwned ? sessionEscape : undefined }
}
