'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
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
	readKeyPress,
	stepEditableColumn,
} from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type { GridActiveEditStore, GridEditingSession } from './grid-editing-context'
import type { GridCellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/** The editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	session: GridEditingSession
	/**
	 * Opens the named cell for editing and focuses its editor once that mounts —
	 * the grid-owned entry behind `session: 'managed'`. Under row scope the
	 * cell names the row to open, and re-entering a row already editing is a
	 * no-op. Under `scope: 'cell'` it re-points the session: the cell it leaves
	 * commits, and a previous row leaves the set. A transition that changes which
	 * rows edit goes through the controllable set, so `onRowsChange` reports it. A
	 * move between cells of one row leaves that set alone. A `seed` opens the
	 * editor with that value in place of the cell's own (type-to-edit).
	 */
	enterEdit: (rowKey: string | number, columnId: string | number, seed?: string | number) => void
	/**
	 * The session's keys, layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor}. Escape abandons the session. From an open editor,
	 * Enter commits and moves down, Tab and Shift+Tab commit and move along the
	 * row, and F2 commits and stays. Every editor (inferred input, listbox,
	 * `editCell` slot) therefore inherits the keys without wiring of its own.
	 * `undefined` unless the grid owns the session (`session: 'managed'`).
	 */
	sessionKeys: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
}

/** Focusable editor content inside an editing cell, in preference order. @internal */
const EDITOR_FOCUSABLE = 'input, select, textarea, button, [tabindex]'

/**
 * Reseats focus on the grid's single tab stop when it currently sits inside the
 * grid. Called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @internal
 */
function restoreGridFocus(): void {
	const active = document.activeElement

	if (active instanceof HTMLElement) active.closest<HTMLElement>('[role="grid"]')?.focus()
}

/**
 * Whether a key press belongs to a floating surface inside the grid rather than
 * to the session. Three kinds of press qualify. The first is a press already
 * consumed (`defaultPrevented`). The second comes from focus inside a portaled
 * panel, such as an open listbox's options or the date picker's calendar. The
 * third lands on an open disclosure's own trigger or input
 * (`aria-expanded="true"`), such as a combobox with its panel open. The
 * surface's own document-level key layer runs after the table's handler, so the
 * session stands down and lets that layer take the press.
 *
 * @internal
 */
function claimedBySurface(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	if (event.defaultPrevented || !(event.target instanceof Element)) return true

	return (
		event.target.closest('[data-floating-ui-portal]') !== null ||
		event.target.closest('[aria-expanded="true"]') !== null
	)
}

/**
 * The elements whose own Enter does something native: a button or link
 * activates, a text area breaks the line, and a select opens. The session's
 * Enter leaves them alone. The inline listbox's trigger is a button, so it
 * keeps the Enter that opens it. @internal
 */
const NATIVE_ENTER = 'button, a[href], textarea, select, [contenteditable="true"]'

/** Where a move key takes the session from an open editor. @internal */
type SessionMove = 'down' | 'next' | 'previous' | 'here'

/**
 * The move a key press asks of the session from an open editor, or `null` when
 * the press is not the session's. The tab stop's own keys are the cursor's,
 * which enter a cell. A key with Ctrl, Cmd, or Alt is the editor's shortcut.
 * Enter on an element that acts on it natively stays with that element.
 *
 * @internal
 */
function editorMove(event: ReactKeyboardEvent<HTMLTableElement>): SessionMove | null {
	const target = event.target as Element

	if (target === event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return null

	if (event.key === 'Tab') return event.shiftKey ? 'previous' : 'next'

	if (event.key === 'F2') return 'here'

	if (event.key === 'Enter' && !target.closest(NATIVE_ENTER)) return 'down'

	return null
}

/**
 * Builds the store behind {@link GridActiveEditStore}. `set` notifies only when
 * the coord names another cell, so a write that repeats the held cell renders
 * nothing. @internal
 */
function createActiveEditStore(): GridActiveEditStore & {
	set: (next: GridActiveEdit | null) => void
} {
	let coord: GridActiveEdit | null = null

	const listeners = new Set<() => void>()

	return {
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		get: () => coord,
		set: (next) => {
			if (next === coord || (next !== null && isSameCell(coord, next))) return

			coord = next

			for (const listener of listeners) listener()
		},
	}
}

/** A row's staged cell values, keyed by column id. @internal */
type RowDrafts = Map<string | number, unknown>

/**
 * Resolves a row's staged drafts into committed {@link GridCellChange}s. It keeps
 * each changed cell (its draft differs from the row's current value) that
 * passes the column's {@link GridColumn.validate}, dropping unchanged and
 * invalid ones. Module-level so the flush effect stays within its complexity
 * budget.
 *
 * @remarks The walk is over the drafts, not the columns, so every staged cell is
 * visited whether or not its column is still on screen. Both lookups read
 * {@link GridEditSource} rather than the render window. A row that pages out
 * and a column that hides still commit, and one the consumer removed resolves
 * to nothing and drops.
 *
 * Two reads here are deliberately live rather than taken when the cell staged. A
 * column can lock mid-session, and `onCommit` on an earlier cell can hand back
 * new rows before a later one flushes. A snapshot would answer for the state the
 * editor opened against instead of the state it commits into.
 *
 * @internal
 */
function flushRow<T>(
	rowKey: string | number,
	drafts: RowDrafts,
	source: GridEditSource<T>,
): { changes: GridCellChange[]; refused: GridCellChange[] } {
	const { rows, columns, getKey } = source

	// Keyed over the source rows exactly as `use-grid-table` keys them, so the
	// index a positional `getKey` reads is the one the engine gave the row.
	const row = rows.find((candidate, index) => getKey(candidate, index) === rowKey)

	if (row == null) return { changes: [], refused: [] }

	const changes: GridCellChange[] = []

	const refused: GridCellChange[] = []

	for (const [columnId, value] of drafts) {
		const col = columns.find((candidate) => candidate.id === columnId)

		// The mount predicate closes a locked column's editor on the next render,
		// so the staged value must not write either — the two gates answer to the
		// same `readOnly`. A column the consumer removed resolves to nothing.
		if (!col || !isColumnEditable(col)) continue

		const original = col.field != null ? row[col.field] : undefined

		if (Object.is(value, original)) continue

		const cell: GridCellChange = { rowKey, columnId, value }

		// A refused cell leaves the staging map like any other closed cell, so
		// without this list the value the user typed is gone with no report.
		if (col.validate?.(value, row) != null) refused.push(cell)
		else changes.push(cell)
	}

	return { changes, refused }
}

/**
 * Commits every staged cell whose editor has closed, one `onCommit` batch per
 * row. It hands the cells `validate` refused to `onReject`, and returns the
 * cells saved across them (for the commit announcement).
 * A row with no sink to reach counts nothing, so the announcement never speaks a
 * commit that did not happen.
 * Takes each committed draft out of the staging map on the way, and drops a row's
 * map once nothing is left in it. A still-open cell's draft stays staged.
 *
 * @remarks One rule covers every way a session ends, because each is the same
 * event seen from the cell. A consumer's save and a grid-owned exit close a whole
 * row's editors; a cell-scoped session moving on closes exactly one. Reading the
 * open state, rather than diffing against the last render, is what lets the two
 * share a path. It is also why a cell-scoped batch usually carries one change
 * with no arithmetic saying so: one cell was open, so one closes. A session that
 * narrowed an already-open row is the exception, and it needs no special case
 * either. The editors it closed commit together, per row, like any other.
 *
 * The take stays here rather than inside {@link flushRow}, because this is where
 * the open state is read. The partition into open and closed is what decides
 * which drafts leave the map at all.
 * @internal
 */
function flushClosedCells<T>(args: {
	drafts: Map<string | number, RowDrafts>
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
	source: GridEditSource<T>
	onCommit: ((changes: GridCellChange[]) => void) | undefined
	onReject: ((refused: GridCellChange[]) => void) | undefined
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

		const { changes, refused } = flushRow(rowKey, closed, args.source)

		// Reported per row, like the commit batch beside it, and independent of it:
		// a row whose every cell was refused reaches no sink at all otherwise.
		if (refused.length > 0) args.onReject?.(refused)

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
function useCellScopeWithoutSessionWarning(scoped: boolean, managed: boolean): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!scoped || managed) return

		console.warn(
			"Grid: `editable.scope: 'cell'` narrows a session the grid owns, but `editable.session` is 'manual', where the consumer names a row and never a cell. The row's editors all mount, as under scope 'row' — set `session: 'managed'` to scope a session to one cell.",
		)
	}, [scoped, managed])
}

/**
 * Owns per-row inline editing: the editable rows (a controllable `Set<key>`,
 * consumer-driven by default) and the staged drafts of cells in those rows. A
 * row in the set renders all its editable cells as editors at once; each edit
 * stages into a grid-held ref (no per-keystroke grid render). A row leaves the
 * set on the consumer's save action, or on a grid-owned session exit under
 * `session: 'managed'` (Enter in an editor saves, Escape abandons). Its
 * drafts then flush as a single {@link GridCellChange} batch through `onCommit`,
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
	editSourceRef,
	rowKeysRef,
	dataColumnsRef,
	cellId,
	moveTo,
}: {
	enabled: boolean
	config: GridEditableConfig | undefined
	/** The grid's own rows and columns, which the commit path resolves against. */
	editSourceRef: RefObject<GridEditSource<T>>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The cursor's per-cell id deriver; locates the entered cell's editor to focus it. */
	cellId: (row: number, col: number) => string
	/** The cursor's clamped move, which the commit-and-move keys ride. */
	moveTo: (coord: Coord) => void
}): GridEditingApi {
	// The editable-row set is consumer-driven by default — the grid renders no
	// built-in entry and only reads the binding (a row-action button flips a
	// key). Under `session: 'managed'` the grid also writes it, through the
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
	const managed = enabled && config?.session === 'managed'

	// Cell scope narrows a grid-owned session to the entered cell. It needs that
	// session: under 'manual' the consumer names a row and never a cell, so there
	// is no cell to narrow to and the row's editors all mount.
	const scopeRequested = enabled && config?.scope === 'cell'

	const cellScoped = managed && scopeRequested

	useCellScopeWithoutSessionWarning(scopeRequested, managed)

	// The cell a cell-scoped session edits; null under row scope. Held twice. The
	// state drives this hook's own effects: the commit sweep and the focus hand-off.
	// The store drives the cells, each subscribed to its own flag, so a move along
	// a row renders two cells rather than the whole window.
	const [activeEditRaw, setActiveEditState] = useState<GridActiveEdit | null>(null)

	const storeRef = useRef<ReturnType<typeof createActiveEditStore> | null>(null)

	if (storeRef.current === null) storeRef.current = createActiveEditStore()

	const activeEditStore = storeRef.current

	// Every write the session makes goes to both at event time. The cells and this
	// hook then render in one pass, so the focus effect finds the entered editor
	// already mounted.
	const setActiveEdit = useCallback(
		(next: GridActiveEdit | null) => {
			setActiveEditState(next)

			activeEditStore.set(next)
		},
		[activeEditStore],
	)

	// Three things strand the raw coord. A controlled binding can decline an entry,
	// so the row never joins the set; a consumer save can drop an editing row from
	// under the session; and `scope` or `session` can change under a live session,
	// which leaves a coord the current config would never have written.
	const stranded =
		activeEditRaw !== null && (!cellScoped || !editableRows.has(activeEditRaw.rowKey))

	// Drop a stranded coord rather than only read past it. Masking alone survives
	// as state, so the same row re-entering the set later would revive a cell
	// nobody opened and mount its editor alone. Adjusting the state here is
	// React's answer to a value gone stale against its input, and it beats an
	// effect that resynchronizes a render late.
	if (stranded) setActiveEditState(null)

	const activeEdit = stranded ? null : activeEditRaw

	// The derivation above clears a stranded coord during render, where the store
	// must not notify. Mirror it here instead. Every other write already reached
	// the store at event time, so this is a no-op for them.
	useLayoutEffect(() => {
		activeEditStore.set(activeEdit)
	}, [activeEdit, activeEditStore])

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeEditRef = useRef(activeEdit)

	activeEditRef.current = activeEdit

	const onCommitRef = useRef(config?.onCommit)

	onCommitRef.current = config?.onCommit

	const onRejectRef = useRef(config?.onReject)

	onRejectRef.current = config?.onReject

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

	// The value a type-to-edit entry opens its editor with, beside the focus
	// intent and cleared with it. The editor reads it once, as it mounts.
	const pendingSeedRef = useRef<(GridActiveEdit & { value?: string | number }) | null>(null)

	const entrySeed = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingSeedRef.current

		return pending && isSameCell(pending, { rowKey, columnId }) ? pending.value : undefined
	}, [])

	// The row the grid-owned session holds, with how it came by it. Row scope
	// keeps no coord, and Escape has to reach the session from anywhere in the
	// grid under both scopes, so the row is recorded here rather than read off
	// `activeEdit`. Provenance rides the row because the row is its subject: read
	// off the cell it would be recomputed on every move, and a move within an
	// acquired row would find that row already in the set and forget the session
	// had put it there.
	const sessionRowRef = useRef<{ rowKey: string | number; acquired: boolean } | null>(null)

	const enterEdit = useCallback(
		(rowKey: string | number, columnId: string | number, seed?: string | number) => {
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

			pendingSeedRef.current = { rowKey, columnId, value: seed }

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
		[cellScoped, setEditableRows, setActiveEdit],
	)

	// Focus the entered cell's editor once the session carries it — after the
	// editors mount.
	useEffect(() => {
		const pending = pendingFocusRef.current

		if (!pending) return

		pendingFocusRef.current = null

		// The editor read its seed as it mounted, in the render just past.
		pendingSeedRef.current = null

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
	 * Ends a grid-owned session on `rowKey`. It reseats focus on the grid's tab
	 * stop and drops the row from the set. The flush sweep then commits the
	 * editors that closed with it. `'discard'` drops the session's staged values
	 * ahead of the sweep, so it finds nothing left to emit.
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
		[unstageDraft, setEditableRows, setActiveEdit],
	)

	// The session one key press names. The press names its row when it came from
	// inside one, which is what picks the right row while several edit at once.
	// Elsewhere in the grid — the tab stop after a Tab back, a header control —
	// it names none, and the session the grid opened is the one it means. The
	// column comes from the press's cell, and only an open editor's cell names
	// one. Escape reads the row alone; Enter needs the editor.
	const sessionTarget = useCallback(
		(target: Element): { rowKey: string | number; columnId: string | number | null } | null => {
			const rowIndex = target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

			const rowKey =
				rowIndex === null || rowIndex === undefined
					? sessionRowRef.current?.rowKey
					: rowKeysRef.current[Number(rowIndex)]

			if (rowKey == null || !editableRowsRef.current.has(rowKey)) return null

			const colAttr = target.closest('td[data-grid-col]')?.getAttribute('data-grid-col')

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
		[rowKeysRef, dataColumnsRef],
	)

	// Enter commits the session and moves the cursor down one row. Under cell
	// scope it enters the next row's cell, which is the column-wise fill flow of a
	// spreadsheet. On the last row the cursor stays, and focus rests on the tab
	// stop. The exit and the entry are two writes, so a controlled binding can
	// decline the entry and keep the commit.
	const commitDown = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const rowKeys = rowKeysRef.current

			const row = rowKeys.indexOf(rowKey)

			const col = dataColumnsRef.current.findIndex((column) => column.id === columnId)

			endSession(rowKey, 'save')

			const next = rowKeys[row + 1]

			moveTo({ row: next === undefined ? row : row + 1, col })

			if (cellScoped && next !== undefined) enterEdit(next, columnId)
		},
		[cellScoped, endSession, enterEdit, moveTo, rowKeysRef, dataColumnsRef],
	)

	// F2 commits the session and leaves the cursor on the cell, with focus back on
	// the tab stop. It toggles edit off, as F2 on the tab stop toggles it on.
	const commitHere = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const row = rowKeysRef.current.indexOf(rowKey)

			const col = dataColumnsRef.current.findIndex((column) => column.id === columnId)

			endSession(rowKey, 'save')

			moveTo({ row, col })
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

			const row = rowKeysRef.current.indexOf(rowKey)

			const col = columns.findIndex((column) => column.id === columnId)

			const next = stepEditableColumn(columns, col, step)

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

				if (editor) focusWithoutReveal(editor)

				return
			}

			// Blur the editor while it is still mounted, so a value it stages on blur
			// reaches the draft before the sweep commits the cell.
			restoreGridFocus()

			enterEdit(rowKey, target.id)
		},
		[cellScoped, cellId, commitHere, enterEdit, moveTo, rowKeysRef, dataColumnsRef],
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
			if (claimedBySurface(event) || readKeyPress(event).composing) return

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
		[endSession, sessionTarget, runMove],
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
			source: editSourceRef.current,
			onCommit: onCommitRef.current,
			onReject: onRejectRef.current,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3).
		if (saved > 0) announce(describeCommit(saved))
	}, [editableRows, activeEdit, editSourceRef])

	const session = useMemo<GridEditingSession>(
		() => ({
			editableRows,
			activeEditStore,
			stageDraft,
			unstageDraft,
			endSession,
			entrySeed,
			managed,
		}),
		[editableRows, activeEditStore, stageDraft, unstageDraft, managed, endSession, entrySeed],
	)

	return { session, enterEdit, sessionKeys: managed ? sessionKeys : undefined }
}
