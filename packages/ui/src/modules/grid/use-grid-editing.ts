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
import { describeCommit } from './engine/grid-announcements'
import { EMPTY_SET } from './engine/grid-constants'
import {
	type GridActiveEdit,
	isCellEditing,
	isColumnEditable,
	isSameCell,
} from './engine/grid-editing-utilities'
import type { GridEditingSession } from './grid-editing-context'
import type { CellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'

/** The editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	session: GridEditingSession
	/**
	 * Opens the named cell for editing and focuses its editor once that mounts —
	 * the grid-owned entry behind `trigger: 'doubleClick'`. Under row scope the
	 * cell names the row to open, and re-entering a row already editing is a
	 * no-op. Under `scope: 'cell'` it re-points the session: the cell it leaves
	 * commits, and a previous row leaves the set. A transition that changes which
	 * rows edit goes through the controllable set, so `onRowsChange` reports it; a
	 * move between cells of one row leaves that set alone.
	 */
	enterEdit: (rowKey: string | number, columnId: string | number) => void
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

		// A column can lock while its editor is open. The mount predicate closes
		// that editor on the next render, so the staged value must not write either
		// — the two gates answer to the same `readOnly`.
		if (!isColumnEditable(col)) continue

		const value = args.drafts.get(col.id)

		const original = col.field != null ? row[col.field] : undefined

		if (Object.is(value, original)) continue

		if (col.validate?.(value, row) != null) continue

		changes.push({ rowKey: args.rowKey, columnId: col.id, value })
	}

	return changes
}

/**
 * Commits every staged cell whose editor has closed, one `onCommit` batch per
 * row, and returns the cells saved across them (for the commit announcement).
 * A row with no sink to reach counts nothing, so the announcement never speaks a
 * commit that did not happen.
 * Takes each committed draft out of the staging map on the way, and drops a row's
 * map once nothing is left in it; a still-open cell's draft stays staged.
 *
 * @remarks One rule covers every way a session ends, because each is the same
 * event seen from the cell. A consumer's save and a grid-owned exit close a whole
 * row's editors; a cell-scoped session moving on closes exactly one. Reading the
 * open state, rather than diffing against the last render, is what lets the two
 * share a path. It is also why a cell-scoped batch usually carries one change
 * with no arithmetic saying so: one cell was open, so one closes. A session that
 * narrowed an already-open row is the exception, and it needs no special case
 * either — the editors it closed commit together, per row, like any other.
 *
 * The take stays here rather than inside {@link flushRow}, which walks `columns`
 * instead: a draft staged for a hidden column, or for a row that has since gone,
 * would never be swept.
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
		const closed: RowDrafts = new Map()

		for (const [columnId, value] of rowDrafts) {
			if (
				isCellEditing({
					rowKey,
					columnId,
					editableRows: args.editableRows,
					activeEdit: args.activeEdit,
				})
			)
				continue

			closed.set(columnId, value)

			rowDrafts.delete(columnId)
		}

		if (rowDrafts.size === 0) args.drafts.delete(rowKey)

		if (closed.size === 0) continue

		const changes = flushRow({
			rowKey,
			drafts: closed,
			columns: args.columns,
			rows: args.rows,
			rowKeys: args.rowKeys,
		})

		if (!changes.length || !args.onCommit) continue

		args.onCommit(changes)

		saved += changes.length
	}

	return saved
}

/**
 * Warns in development when `scope: 'cell'` is set without the grid-owned session
 * it narrows, matching the module's other config-mismatch warnings. The pair is
 * inert rather than wrong, because the row's editors mount as under row scope.
 * It therefore fails silently, which is what the warning is for. @internal
 */
function useCellScopeWithoutSessionWarning(scoped: boolean, sessionOwned: boolean): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!scoped || sessionOwned) return

		console.warn(
			"Grid: `editable.scope: 'cell'` narrows a session the grid owns, but `editable.trigger` is 'manual', where the consumer names a row and never a cell. The row's editors all mount, as under scope 'row' — set `trigger: 'doubleClick'` to scope a session to one cell.",
		)
	}, [scoped, sessionOwned])
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
	const scopeRequested = enabled && config?.scope === 'cell'

	const cellScoped = sessionOwned && scopeRequested

	useCellScopeWithoutSessionWarning(scopeRequested, sessionOwned)

	// The cell a cell-scoped session edits; null under row scope. Held as state
	// because it gates which cell mounts an editor.
	const [activeEditRaw, setActiveEdit] = useState<GridActiveEdit | null>(null)

	// Three things strand the raw coord. A controlled binding can decline an entry,
	// so the row never joins the set; a consumer save can drop an editing row from
	// under the session; and `scope` or `trigger` can change under a live session,
	// which leaves a coord the current config would never have written.
	const stranded =
		activeEditRaw !== null && (!cellScoped || !editableRows.has(activeEditRaw.rowKey))

	// Drop a stranded coord rather than only read past it. Masking alone survives
	// as state, so the same row re-entering the set later would revive a cell
	// nobody opened and mount its editor alone. Adjusting the state here is
	// React's answer to a value gone stale against its input, and it beats an
	// effect that resynchronizes a render late.
	if (stranded) setActiveEdit(null)

	const activeEdit = stranded ? null : activeEditRaw

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

	// The cell whose editor takes focus once it mounts, set by `enterEdit`. The
	// effect below resolves it after the render that mounts the editor, which a
	// controlled binding can delay by a consumer round-trip.
	const pendingFocusRef = useRef<GridActiveEdit | null>(null)

	// The row the grid-owned session holds, with how it came by it. Row scope
	// keeps no coord, and Escape has to reach the session from anywhere in the
	// grid under both scopes, so the row is recorded here rather than read off
	// `activeEdit`. Provenance rides the row because the row is its subject: read
	// off the cell it would be recomputed on every move, and a move within an
	// acquired row would find that row already in the set and forget the session
	// had put it there.
	const sessionRowRef = useRef<{ rowKey: string | number; acquired: boolean } | null>(null)

	const enterEdit = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const active = activeEditRef.current

			const editableRows = editableRowsRef.current

			// A cell-scoped session names one cell and holds one row; row scope names
			// no cell and leaves the rows the consumer put in the set alone.
			const entering = cellScoped ? { rowKey, columnId } : null

			// Entering changes nothing when the session already sits where it points:
			// this cell under cell scope, this row under row scope, where the whole
			// row opens at once. `isCellEditing` cannot answer this, because it is the
			// mount question: it holds for every cell of a row the consumer opened,
			// so it would refuse to narrow one. A session that has not started is not
			// a reason to decline starting it.
			if (entering ? isSameCell(active, entering) : editableRows.has(rowKey)) return

			pendingFocusRef.current = { rowKey, columnId }

			const held = sessionRowRef.current

			// Only a row the session acquired leaves the set with it. One it borrowed
			// stays, and drops back to the row-shaped state the consumer asked for.
			const leaving =
				entering && held && held.rowKey !== rowKey && held.acquired ? held.rowKey : null

			// A move within the held row keeps that row's provenance; a move onto
			// another records how this one was come by, once, before the set is
			// written and can no longer answer the question.
			sessionRowRef.current =
				held?.rowKey === rowKey ? held : { rowKey, acquired: !editableRows.has(rowKey) }

			setActiveEdit(entering)

			// The set is unchanged when the session moves along one row, or moves off a
			// borrowed row onto one already in the set. Writing it anyway would
			// announce a transition that never happened, because the controllable
			// emits `onRowsChange` on every write, equal or not.
			if (leaving === null && editableRows.has(rowKey)) return

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				// The row a cell-scoped session leaves exits the set, and the flush
				// sweep commits what it staged there.
				if (leaving !== null) next.delete(leaving)

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

		// The cell's display coord resolves here rather than travelling from the
		// entry: `onCommit` can re-sort the consumer's rows on the way in, and this
		// reads the order the editor actually mounted against.
		const row = rowKeysRef.current.indexOf(pending.rowKey)

		const col = dataColumnsRef.current.findIndex((column) => column.id === pending.columnId)

		if (row < 0 || col < 0) return

		const editor = document
			.getElementById(cellId(row, col))
			?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		// The editor sits inside its cell's truncation span; focusing it here fires a
		// `focusin` that arms that span. This effect runs during React's commit, where
		// the arm's synchronous `flushSync` cannot flush and warns — route the focus
		// through the helper so the arm takes its no-flush path.
		if (editor) focusWithoutReveal(editor)
	}, [editableRows, activeEdit, cellId, rowKeysRef, dataColumnsRef])

	/**
	 * Ends a grid-owned session on `rowKey`: reseats focus on the grid's tab stop,
	 * drops the row from the set, and lets the flush sweep commit the editors that
	 * closed with it. `'discard'` drops the session's staged values ahead of the
	 * sweep, so it finds nothing left to emit.
	 */
	const endSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard') => {
			if (!editableRowsRef.current.has(rowKey)) return

			// The active cell only concerns this call when it sits on this row.
			const cell = activeEditRef.current?.rowKey === rowKey ? activeEditRef.current : null

			// Reseat focus ahead of the discard, not after. An editor blurred on the
			// way out can stage one last value; `NumberInput` commits its typed text
			// there. That write must not outlive the values being dropped.
			restoreGridFocus()

			// A cell-scoped session abandons the cell it sits on; the cells it visited
			// before that one committed as it left them, so their values are not the
			// session's to discard. Row scope drops the whole row's drafts.
			if (outcome === 'discard') {
				if (cell) unstageDraft(rowKey, cell.columnId)
				else draftsRef.current.delete(rowKey)
			}

			if (sessionRowRef.current?.rowKey === rowKey) sessionRowRef.current = null

			// Two things end a session, and each clears the coord its own way. This
			// exit is one. The other is a consumer withdrawing the row from under it,
			// which the derivation above catches: a coord off the set reads as no
			// session at all.
			if (cell) setActiveEdit(null)

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[unstageDraft, setEditableRows],
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

			// The press names its row when it came from inside one, which is what picks
			// the right row while several edit at once. Elsewhere in the grid — the
			// tab stop after a Tab back, a header control, a cell of a row that is not
			// editing — it names none, and the session the grid opened is the one to
			// end. Without that fallback Escape reads as dead everywhere but the
			// editor, while the draft stays staged with nothing to say so.
			const rowIndex = event.target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

			const rowKey =
				rowIndex === null || rowIndex === undefined
					? sessionRowRef.current?.rowKey
					: rowKeysRef.current[Number(rowIndex)]

			if (rowKey == null || !editableRowsRef.current.has(rowKey)) return

			event.preventDefault()

			endSession(rowKey, 'discard')
		},
		[endSession, rowKeysRef],
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
		if (saved > 0) announce(describeCommit(saved))
	}, [editableRows, activeEdit, dataColumnsRef, rowsRef, rowKeysRef])

	const session = useMemo<GridEditingSession>(
		() => ({
			editableRows,
			activeEdit,
			stageDraft,
			unstageDraft,
			endSession,
			sessionOwned,
		}),
		[editableRows, activeEdit, stageDraft, unstageDraft, sessionOwned, endSession],
	)

	return { session, enterEdit, sessionEscape: sessionOwned ? sessionEscape : undefined }
}
