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
import { type GridActiveEdit, isCellEditing } from './engine/grid-editing-utilities'
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
 * Takes a row's closed-editor drafts out of the staging map and returns them —
 * the cells {@link isCellEditing} stops holding for. A still-open cell's draft
 * stays staged, and the row's map goes once nothing is left in it. @internal
 */
function takeClosedDrafts(args: {
	rowKey: string | number
	rowDrafts: RowDrafts
	drafts: Map<string | number, RowDrafts>
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
}): RowDrafts {
	const closed: RowDrafts = new Map()

	for (const [columnId, value] of args.rowDrafts) {
		if (isCellEditing({ ...args, columnId })) continue

		closed.set(columnId, value)

		args.rowDrafts.delete(columnId)
	}

	if (args.rowDrafts.size === 0) args.drafts.delete(args.rowKey)

	return closed
}

/**
 * Commits every staged cell whose editor has closed, one `onCommit` batch per
 * row, and returns the cells saved across them (for the commit announcement).
 *
 * @remarks One rule covers every way a session ends, because each is the same
 * event seen from the cell. A consumer's save and a grid-owned exit close a whole
 * row's editors; a cell-scoped session moving on closes exactly one. Reading the
 * open state, rather than diffing against the last render, is what lets the two
 * share a path. It is also why a cell-scoped batch carries one change with no
 * arithmetic saying so: only one of its cells was ever open to close.
 * @internal
 */
function flushClosedCells<T>(args: {
	drafts: Map<string | number, RowDrafts>
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onCommit: ((changes: CellChange[]) => void) | undefined
}): number {
	let saved = 0

	for (const [rowKey, rowDrafts] of args.drafts) {
		const closed = takeClosedDrafts({ ...args, rowKey, rowDrafts })

		if (closed.size === 0) continue

		const changes = flushRow({
			rowKey,
			drafts: closed,
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
 * A grid-owned session under `scope: 'cell'` narrows to one cell. The row still
 * enters the set, but only the active cell mounts an editor. Entering another
 * cell re-points the session and flushes the cell it leaves, so each batch
 * carries one change. Both scopes read one predicate for what is open,
 * {@link isCellEditing}; the flush sweep commits whatever it stops holding for.
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

	// Two things strand the raw coord. A controlled binding can decline an entry,
	// so the row never joins the set; a consumer save can drop an editing row from
	// under the session. Deriving the live coord covers both, with no effect to
	// resynchronize.
	const activeEdit = activeEditRaw && editableRows.has(activeEditRaw.rowKey) ? activeEditRaw : null

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeEditRef = useRef(activeEdit)

	activeEditRef.current = activeEdit

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

			const editableRows = editableRowsRef.current

			// Re-entering the cell already open is the no-op — which under row scope,
			// where the whole row is open, means re-entering the row.
			if (isCellEditing({ rowKey, columnId, editableRows, activeEdit: active })) return

			pendingFocusRef.current = { rowKey, columnId, coord }

			if (!cellScoped) {
				setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))

				return
			}

			// A cell-scoped session names one cell and holds one row: the row it
			// leaves exits the set, and the flush sweep commits what it staged there.
			setActiveEdit({ rowKey, columnId })

			// The set is unchanged when the session moves along one row. Writing it
			// anyway would announce a transition that never happened, because the
			// controllable emits `onRowsChange` on every write, equal or not.
			if (active?.rowKey === rowKey) return

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				if (active) next.delete(active.rowKey)

				return next.add(rowKey)
			})
		},
		[cellScoped, setEditableRows],
	)

	// Focus the entered cell's editor once the session carries it — after the
	// editors mount.
	useEffect(() => {
		const pending = pendingFocusRef.current

		if (!pending) return

		pendingFocusRef.current = null

		// The editor exists only once the session covers the entered cell: a
		// controlled binding can decline the row, and a cell-scoped session can
		// already point elsewhere. Either way the intent drops rather than stealing
		// focus on a later, unrelated edit.
		if (!isCellEditing({ ...pending, editableRows, activeEdit })) return

		const editor = document
			.getElementById(cellId(pending.coord.row, pending.coord.col))
			?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		// The editor sits inside its cell's truncation span; focusing it here fires a
		// `focusin` that arms that span. This effect runs during React's commit, where
		// the arm's synchronous `flushSync` cannot flush and warns — route the focus
		// through the helper so the arm takes its no-flush path.
		if (editor) focusWithoutReveal(editor)
	}, [editableRows, activeEdit, cellId])

	/**
	 * Ends a grid-owned session on `rowKey`: reseats focus on the grid's tab stop,
	 * drops the row from the set, and lets the flush sweep commit the editors that
	 * closed with it. `'discard'` drops the session's staged values ahead of the
	 * sweep, so it finds nothing left to emit.
	 */
	const endSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard') => {
			if (!editableRowsRef.current.has(rowKey)) return

			const active = activeEditRef.current

			// Reseat focus ahead of the discard, not after. An editor blurred on the
			// way out can stage one last value; `NumberInput` commits its typed text
			// there. That write must not outlive the values being dropped.
			restoreGridFocus()

			// A cell-scoped session abandons the cell it sits on; the cells it visited
			// before that one committed as it left them, so their values are not the
			// session's to discard. Row scope drops the whole row's drafts.
			if (outcome === 'discard') {
				if (active?.rowKey === rowKey) unstageDraft(rowKey, active.columnId)
				else draftsRef.current.delete(rowKey)
			}

			// Two things end a session, and each clears the coord its own way. This
			// exit is one. The other is a consumer withdrawing the row from under it,
			// which the derivation above catches: a coord off the set reads as no
			// session at all.
			if (active?.rowKey === rowKey) setActiveEdit(null)

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[unstageDraft, setEditableRows],
	)

	const commitRowEdit = useCallback(
		(rowKey: string | number) => endSession(rowKey, 'save'),
		[endSession],
	)

	const cancelRowEdit = useCallback(
		(rowKey: string | number) => endSession(rowKey, 'discard'),
		[endSession],
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

	// Commit the cells whose editors closed in the render just past: the drafts
	// outlive their editors in the ref, and this is where they land in the sink.
	// The open state answers it on its own, so no copy of the last render is kept
	// to diff against.
	useEffect(() => {
		const saved = flushClosedCells({
			drafts: draftsRef.current,
			editableRows,
			activeEdit,
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
			commitRowEdit: sessionOwned ? commitRowEdit : undefined,
			cancelRowEdit: sessionOwned ? cancelRowEdit : undefined,
		}),
		[
			editableRows,
			activeEdit,
			stageDraft,
			unstageDraft,
			sessionOwned,
			commitRowEdit,
			cancelRowEdit,
		],
	)

	return { rowEditing, enterRowEdit, sessionEscape: sessionOwned ? sessionEscape : undefined }
}
