'use client'

import {
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import {
	describeCommit,
	describeDiscard,
	describeHistoryMiss,
	describeSettle,
	type GridSaveOutcome,
} from './engine/grid-announcements'
import { columnLabel } from './engine/grid-column/label'
import { EMPTY_SET, FLOATING_PORTAL } from './engine/grid-constants'
import {
	type GridHistoryCell,
	type GridHistoryStep,
	historyStep,
	historyValue,
} from './engine/grid-edit-history'
import {
	COMMIT_REFUSED,
	createDraftStore,
	EDITOR_FOCUSABLE,
	type EditorKind,
	type GridActiveEdit,
	type GridDraft,
	type GridDraftStore,
	isCellEditing,
	isColumnEditable,
	isInGrid,
	isSameCell,
	isThenable,
	NATIVE_ENTER,
	NEW_ROW_KEY,
	readKeyPress,
	stepEditableColumn,
	tabStaysInCell,
} from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type {
	GridActiveEditStore,
	GridEditingSession,
	GridNewRowSession,
	GridSettleControls,
} from './grid-editing-context'
import type { GridCellChange, GridCellRefusal, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridEditHistory } from './use-grid-edit-history'
import type { Coord, GridNewRowPosition } from './use-grid-navigation'
import { resolveNewRow, useGridNewRow } from './use-grid-new-row'

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
	 * editor with that value in place of the cell's own (type-to-edit). Under a
	 * controlled `cell` the entry only asks. The move and its rows write
	 * wait until the consumer applies the cell.
	 */
	enterEdit: (rowKey: string | number, columnId: string | number, seed?: string | number) => void
	/**
	 * The session's keys, layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor}. Escape abandons the session. From an open editor,
	 * Enter commits and moves down, and F2 commits and stays. Tab and Shift+Tab
	 * move between the controls of one cell first, and past the last control
	 * they commit and move along the row. Every editor (inferred input, listbox,
	 * `editCell` slot) therefore inherits the keys without wiring of its own.
	 * `undefined` unless the grid owns the session (`session: 'managed'`).
	 */
	sessionKeys: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
	/**
	 * The undo and redo keys, layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor} under either session. They act on the tab stop only,
	 * so an open editor keeps its own text undo. `undefined` unless
	 * {@link GridEditableConfig.history} is on.
	 */
	historyKeys: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
	/**
	 * One step through the history, for the grid's `ref` handle
	 * ({@link GridHandle}). It returns whether it wrote a cell, and it leaves
	 * the cursor where it is. With the history off, it does nothing.
	 */
	stepHistory: (step: GridHistoryStep) => boolean
	/**
	 * The session's commit on leave, layered onto the grid `<table>`'s focus
	 * handlers by {@link useGridCursor}. `blur` reads each focus move out of an
	 * editor, or out of the grid, against `commitOn`. When the move leaves what
	 * that policy watches, it commits the session. `focus` tells a surface that
	 * the grid renders from an unrelated element, through the React tree.
	 * `undefined` unless the grid owns the session and `commitOn` is not
	 * `'explicit'`.
	 */
	sessionLeave:
		| {
				blur: (event: ReactFocusEvent<HTMLTableElement>) => void
				focus: (event: ReactFocusEvent<HTMLTableElement>) => void
		  }
		| undefined
	/** The new-row slot ({@link GridEditableConfig.newRow}). */
	newRow: {
		/** Where the slot shows, or `null` when the grid shows none. */
		position: GridNewRowPosition
		/** The slot as its cells read it, or `null` when the grid shows none. */
		session: GridNewRowSession | null
		/** Opens a cell of the slot from the keyboard cursor, with an optional typed seed. */
		enter: (columnId: string | number, seed?: string | number) => void
		/** The editor that the grid infers for a column of the slot. */
		editorKind: (column: { id: string | number; field?: PropertyKey }) => EditorKind
	}
}

/** The commit policy of a grid-owned session, {@link GridEditableConfig.commitOn}. @internal */
type CommitOn = NonNullable<GridEditableConfig['commitOn']>

/**
 * Reseats focus on the grid's single tab stop, `grid`, when focus sits in this
 * grid. Called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @remarks Focus in another grid stays where it is. That includes a grid nested
 * in a detail row of this one, because none of its elements unmount with the
 * exit. {@link isInGrid} tells the two apart.
 *
 * @internal
 */
function restoreGridFocus(grid: HTMLElement | null): void {
	if (grid && isInGrid(document.activeElement, grid)) grid.focus()
}

/**
 * Whether `node` is in a floating surface that an editor opened. That is a
 * portaled panel, such as an open listbox's options or the date picker's
 * calendar. It is also an open disclosure's own trigger or input
 * (`aria-expanded="true"`), such as a combobox with its panel open. Only the
 * key surface reads this rule, because a key reaches the table only from its
 * own React tree. The commit on leave must not read it for the element that
 * takes focus: an unrelated surface on the page matches it too. @internal
 */
function inFloatingSurface(node: Element): boolean {
	return node.closest(FLOATING_PORTAL) !== null || node.closest('[aria-expanded="true"]') !== null
}

/**
 * Whether a key press belongs to a floating surface inside the grid rather than
 * to the session. A press already consumed (`defaultPrevented`) qualifies, and
 * so does a press from focus in a surface (see {@link inFloatingSurface}). The
 * surface's own document-level key layer runs after the table's handler, so the
 * session stands down and lets that layer take the press.
 *
 * @internal
 */
function claimedBySurface(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	if (event.defaultPrevented || !(event.target instanceof Element)) return true

	return inFloatingSurface(event.target)
}

/** Where a move key takes the session from an open editor. @internal */
type SessionMove = 'down' | 'next' | 'previous' | 'here'

/**
 * The move a key press asks of the session from an open editor, or `null` when
 * the press is not the session's. The tab stop's own keys are the cursor's,
 * which enter a cell. A key with Ctrl, Cmd, or Alt is the editor's shortcut.
 * Enter on an element that acts on it natively stays with that element. Tab
 * that has a next control in the same cell stays with the browser (see
 * {@link tabStaysInCell}).
 *
 * @internal
 */
function editorMove(event: ReactKeyboardEvent<HTMLTableElement>): SessionMove | null {
	const target = event.target as Element

	if (target === event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return null

	// Tab moves between the controls of one cell first. Only Tab past the last
	// control, or Shift+Tab past the first, commits and moves.
	if (event.key === 'Tab') {
		if (tabStaysInCell(target, event.shiftKey)) return null

		return event.shiftKey ? 'previous' : 'next'
	}

	if (event.key === 'F2') return 'here'

	if (event.key === 'Enter' && !target.closest(NATIVE_ENTER)) return 'down'

	return null
}

/** Whether two coords name the same cell; two null coords do too. @internal */
function sameCell(a: GridActiveEdit | null, b: GridActiveEdit | null): boolean {
	return a === b || (b !== null && isSameCell(a, b))
}

/**
 * Builds the store behind {@link GridActiveEditStore}. `seat` moves the coord
 * and the editable rows without a notice, for the render that resolves them.
 * The cells that render in that pass then read the new values. `set` moves the
 * coord and notifies the rest. It notifies only when the coord names another
 * cell than the listeners last heard, so a write that repeats the held cell
 * renders nothing. `setRows` does the same for the set of editable rows.
 * `notify` tells every listener that a draft changed status. @internal
 */
function createActiveEditStore(): GridActiveEditStore & {
	seat: (next: GridActiveEdit | null, rows: ReadonlySet<string | number>) => void
	set: (next: GridActiveEdit | null) => void
	setRows: (next: ReadonlySet<string | number>) => void
	notify: () => void
} {
	let coord: GridActiveEdit | null = null

	let told: GridActiveEdit | null = null

	let rows: ReadonlySet<string | number> = EMPTY_SET

	let toldRows: ReadonlySet<string | number> = EMPTY_SET

	const listeners = new Set<() => void>()

	return {
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		get: () => coord,
		rows: () => rows,
		seat: (next, nextRows) => {
			coord = next

			rows = nextRows
		},
		set: (next) => {
			coord = next

			if (sameCell(told, next)) return

			told = next

			for (const listener of listeners) listener()
		},
		setRows: (next) => {
			rows = next

			if (toldRows === next) return

			toldRows = next

			for (const listener of listeners) listener()
		},
		notify: () => {
			for (const listener of listeners) listener()
		},
	}
}

/**
 * Whether a cell that a consumer names can hold a session: its row is in the
 * source rows, and its column is editable. The grid's own entries pass this by
 * construction. A consumer's `cell` does not, so it is read here. @internal
 */
function isEditableCell<T>(cell: GridActiveEdit, source: GridEditSource<T>): boolean {
	const col = source.columns.find((candidate) => candidate.id === cell.columnId)

	if (!col || !isColumnEditable(col)) return false

	return source.rows.some((row, index) => source.getKey(row, index) === cell.rowKey)
}

/** A row's staged drafts, keyed by column id. @internal */
type RowDrafts = Map<string | number, GridDraft>

/**
 * Resolves a row's staged drafts into committed {@link GridCellChange}s. It keeps
 * each changed cell (its draft differs from the row's value) that passes the
 * column's {@link GridColumn.validate}, dropping unchanged and invalid ones.
 * Module-level so the flush effect stays within its complexity budget.
 *
 * @remarks The walk is over the drafts, not the columns, so every staged cell is
 * visited whether or not its column is still on screen. Both lookups read
 * {@link GridEditSource} rather than the render window. A row that pages out
 * and a column that hides still commit. A column the consumer removed resolves
 * to nothing and drops.
 *
 * A row that is not in `rows` resolves to the snapshot of its draft: the row
 * object that the draft was first staged against. Under server-side
 * pagination a row on another page is absent from `rows`, and the grid cannot
 * tell it from a deleted row. A user edit is never dropped by default, so the
 * cell commits against its snapshot, and the consumer decides.
 *
 * Two reads here are deliberately live rather than taken when the cell staged. A
 * column can lock mid-session, and `onCommit` on an earlier cell can hand back
 * new rows before a later one flushes. A snapshot would answer for the state the
 * editor opened against instead of the state it commits into. The row snapshot
 * applies only where no live row exists.
 *
 * @internal
 */
function flushRow<T>(
	rowKey: string | number,
	drafts: RowDrafts,
	source: GridEditSource<T>,
): { row: T | undefined; changes: GridCellChange[]; refused: GridCellChange[] } {
	const { rows, columns, getKey } = source

	// Keyed over the source rows exactly as `use-grid-table` keys them, so the
	// index a positional `getKey` reads is the one the engine gave the row.
	const live = rows.find((candidate, index) => getKey(candidate, index) === rowKey)

	const changes: GridCellChange[] = []

	const refused: GridCellChange[] = []

	for (const [columnId, draft] of drafts) {
		const col = columns.find((candidate) => candidate.id === columnId)

		// The mount predicate closes a locked column's editor on the next render,
		// so the staged value must not write either — the two gates answer to the
		// same `readOnly`. A column the consumer removed resolves to nothing.
		if (!col || !isColumnEditable(col)) continue

		const row = live ?? (draft.row as T)

		const value = draft.value

		const original = col.field != null ? row[col.field] : undefined

		if (Object.is(value, original)) continue

		const cell: GridCellChange = { rowKey, columnId, value }

		// A refused cell leaves the staging map like any other closed cell, so
		// without this list the value the user typed is gone with no report.
		if (col.validate?.(value, row) != null) refused.push(cell)
		else changes.push(cell)
	}

	return { row: live ?? (drafts.values().next().value?.row as T | undefined), changes, refused }
}

/**
 * The name of a row in a save announcement: its {@link GridEditSource.rowLabel},
 * else `row` and its key, as the reorder announcement names it. @internal
 */
function rowName<T>(
	source: GridEditSource<T>,
	rowKey: string | number,
	row: T | undefined,
): string {
	return (row !== undefined && source.rowLabel?.(row)) || `row ${rowKey}`
}

/** The label of a column in a save announcement, else its id. @internal */
function cellLabel<T>(source: GridEditSource<T>, columnId: string | number): string {
	const col = source.columns.find((candidate) => candidate.id === columnId)

	return col ? columnLabel(col) : String(columnId)
}

/**
 * The history cells of one row's changes, read before they reach the sink.
 * Each holds the value of its cell, and the value that the change writes. A
 * column with no `field` has no value that the grid can read, so its change
 * is not in the history. @internal
 */
function historyOf<T>(
	changes: GridCellChange[],
	row: T | undefined,
	source: GridEditSource<T>,
): GridHistoryCell[] {
	if (row == null) return []

	const cells: GridHistoryCell[] = []

	for (const change of changes) {
		const col = source.columns.find((candidate) => candidate.id === change.columnId)

		if (col?.field == null) continue

		const { rowKey, columnId, value } = change

		cells.push({ rowKey, columnId, before: row[col.field], after: value })
	}

	return cells
}

/**
 * The live row with `rowKey`, keyed over the source rows as `use-grid-table`
 * keys them, or `undefined` when the rows hold none. @internal
 */
function liveRow<T>(source: GridEditSource<T>, rowKey: string | number): T | undefined {
	return source.rows.find((candidate, index) => source.getKey(candidate, index) === rowKey)
}

/**
 * The live value of a history cell, or `null` when its row or its column is
 * gone, or when the column cannot edit now. A locked column keeps its value
 * through an undo, as it does through a save. @internal
 */
function readHistoryCell<T>(
	source: GridEditSource<T>,
	cell: GridHistoryCell,
): { value: unknown } | null {
	const col = source.columns.find((candidate) => candidate.id === cell.columnId)

	if (col?.field == null || !isColumnEditable(col)) return null

	const row = liveRow(source, cell.rowKey)

	return row == null ? null : { value: row[col.field] }
}

/** The cells of `cells`, grouped by row in their first order. @internal */
function byRow(cells: readonly GridHistoryCell[]): Map<string | number, GridHistoryCell[]> {
	const rows = new Map<string | number, GridHistoryCell[]>()

	for (const cell of cells) {
		const row = rows.get(cell.rowKey)

		if (row) row.push(cell)
		else rows.set(cell.rowKey, [cell])
	}

	return rows
}

/** The sink of a commit, {@link GridEditableConfig.onCommit}. @internal */
type CommitSink = GridEditableConfig['onCommit']

/**
 * One `onCommit` batch that returned a promise: the row, the drafts of its
 * changed cells, and the promise. The drafts go back to the store as pending
 * until the promise settles. The row name and the column labels are read at
 * the commit, so the settle announcement names what the user edited. @internal
 */
type InFlightBatch = {
	rowKey: string | number
	drafts: RowDrafts
	result: PromiseLike<unknown>
	row: string
	labels: Map<string | number, string>
	/** What the batch does: a save, an undo, or a redo. */
	outcome: GridSaveOutcome
	/** The history cells that an accepted save records. An undo and a redo record none. */
	history: GridHistoryCell[]
}

/**
 * The cells that one sweep saved, with the column label of each and the
 * history cells of the sweep. `row` names the row when one row holds all the
 * cells. @internal
 */
type SavedCells = { columns: string[]; row: string | undefined; history: GridHistoryCell[] }

/**
 * The in-flight record of one row's batch, whose sink returned a promise: the
 * drafts of its changed cells, and the label of each. @internal
 */
function inFlightBatch<T>(
	batch: {
		rowKey: string | number
		rowDrafts: RowDrafts
		changes: GridCellChange[]
		result: PromiseLike<unknown>
		row: string
		outcome: GridSaveOutcome
		history: GridHistoryCell[]
	},
	source: GridEditSource<T>,
): InFlightBatch {
	const drafts: RowDrafts = new Map()

	const labels = new Map<string | number, string>()

	for (const change of batch.changes) {
		const draft = batch.rowDrafts.get(change.columnId)

		if (!draft) continue

		drafts.set(change.columnId, draft)

		labels.set(change.columnId, cellLabel(source, change.columnId))
	}

	const { rowKey, result, row, outcome, history } = batch

	return { rowKey, drafts, result, row, labels, outcome, history }
}

/**
 * Commits every staged cell that the session closed, one `onCommit` batch per
 * row. It hands the cells `validate` refused to `onReject`, and returns the
 * cells saved across them as {@link SavedCells}, for the commit announcement.
 * A row with no sink to reach counts nothing, so the announcement never speaks
 * a commit that did not happen. Each closed draft leaves the store. A draft of
 * a cell that is still open stays staged. A batch whose sink returns a promise
 * is not saved yet, so it is not counted. It returns in `inFlight`, with the
 * drafts of its changed cells.
 *
 * @remarks One rule covers every way a session ends, because each is the same
 * event seen from the cell. A consumer's save and a grid-owned exit close a whole
 * row's cells; a cell-scoped session moving on closes exactly one. Reading the
 * open state, rather than diffing against the last render, is what lets the two
 * share a path. It is also why a cell-scoped batch usually carries one change
 * with no arithmetic saying so: one cell was open, so one closes. A session that
 * narrowed an already-open row is the exception, and it needs no special case
 * either. The cells it closed commit together, per row, like any other.
 *
 * The open state is the session's, not the render's. An editor that unmounts
 * for virtualization, a page change, or a hidden column leaves its cell open,
 * so its draft stays staged. A row that left the grid's data commits against
 * its snapshot (see {@link flushRow}).
 * @internal
 */
function flushClosedCells<T>(args: {
	drafts: GridDraftStore
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
	source: GridEditSource<T>
	onCommit: CommitSink | undefined
	onReject: ((refused: GridCellChange[]) => void) | undefined
}): { saved: SavedCells; inFlight: InFlightBatch[] } {
	const saved: string[] = []

	const history: GridHistoryCell[] = []

	// The name of the last row that saved, and how many rows saved.
	let savedRow: string | undefined

	let savedRows = 0

	const inFlight: InFlightBatch[] = []

	// The new-row slot is always open. Its drafts leave through an add, never
	// through this sweep.
	const closed = args.drafts.take(
		(rowKey, columnId) =>
			rowKey !== NEW_ROW_KEY &&
			!isCellEditing({
				rowKey,
				columnId,
				editableRows: args.editableRows,
				activeEdit: args.activeEdit,
			}),
	)

	for (const [rowKey, rowDrafts] of closed) {
		if (rowKey === NEW_ROW_KEY) continue

		const { row, changes, refused } = flushRow(rowKey, rowDrafts, args.source)

		// Reported per row, like the commit batch beside it, and independent of it:
		// a row whose every cell was refused reaches no sink at all otherwise.
		if (refused.length > 0) args.onReject?.(refused)

		if (!changes.length || !args.onCommit) continue

		// Read before the sink runs, because a sink can write the row in place.
		const cells = historyOf(changes, row, args.source)

		const result = args.onCommit(changes)

		const name = rowName(args.source, rowKey, row)

		if (!isThenable(result)) {
			for (const change of changes) saved.push(cellLabel(args.source, change.columnId))

			history.push(...cells)

			savedRow = name

			savedRows++

			continue
		}

		inFlight.push(
			inFlightBatch(
				{ rowKey, rowDrafts, changes, result, row: name, outcome: 'updated', history: cells },
				args.source,
			),
		)
	}

	const row = savedRows === 1 ? savedRow : undefined

	return { saved: { columns: saved, row, history }, inFlight }
}

/** What a step through the history does to its cells. @internal */
function historyOutcome(step: GridHistoryStep): GridSaveOutcome {
	return step === 'undo' ? 'undone' : 'redone'
}

/**
 * Sends the cells of one history step through the sink, one batch for each
 * row, as a save sends them. It returns the cells that saved at once, and each
 * batch whose sink returned a promise. That batch pends as a save does, and
 * its settle speaks the step. A step writes a value that was valid, so no
 * `validate` runs. @internal
 */
function sendHistory<T>(args: {
	cells: readonly GridHistoryCell[]
	step: GridHistoryStep
	source: GridEditSource<T>
	onCommit: CommitSink | undefined
}): { saved: SavedCells; inFlight: InFlightBatch[] } {
	const { step, source, onCommit } = args

	const columns: string[] = []

	const names: string[] = []

	const inFlight: InFlightBatch[] = []

	// With no sink, nothing saves, so nothing is announced.
	if (!onCommit) return { saved: { columns, row: undefined, history: [] }, inFlight }

	for (const [rowKey, cells] of byRow(args.cells)) {
		const row = liveRow(source, rowKey)

		const changes = cells.map((cell) => ({
			rowKey,
			columnId: cell.columnId,
			value: historyValue(cell, step),
		}))

		const result = onCommit(changes)

		const name = rowName(source, rowKey, row)

		if (!isThenable(result)) {
			for (const change of changes) columns.push(cellLabel(source, change.columnId))

			names.push(name)

			continue
		}

		const rowDrafts: RowDrafts = new Map()

		for (const change of changes) {
			const draft: GridDraft = {
				value: change.value,
				status: 'staged',
				row,
				error: undefined,
				reopened: false,
			}

			rowDrafts.set(change.columnId, draft)
		}

		const outcome = historyOutcome(step)

		inFlight.push(
			inFlightBatch(
				{ rowKey, rowDrafts, changes, result, row: name, outcome, history: [] },
				source,
			),
		)
	}

	const row = names.length === 1 ? names[0] : undefined

	return { saved: { columns, row, history: [] }, inFlight }
}

/**
 * Settles each draft of `batch` in the store: accepted, or refused with the
 * error that `refused` names for its column. `reopen` answers whether a
 * refused cell opens beside the session. A draft that the cell no longer holds
 * counts nothing. It returns the column labels of the accepted and the refused
 * cells, for the announcement. It also returns the ids of the accepted cells,
 * for the history. @internal
 */
function settleDrafts(args: {
	batch: InFlightBatch
	refused: Map<string | number, string>
	drafts: GridDraftStore
	reopen: (columnId: string | number) => boolean
}): { saved: string[]; failed: string[]; accepted: Set<string | number> } {
	const { batch, refused, drafts } = args

	const saved: string[] = []

	const failed: string[] = []

	const accepted = new Set<string | number>()

	for (const [columnId, draft] of batch.drafts) {
		const error = refused.get(columnId)

		const refusal = error === undefined ? null : { error, reopen: args.reopen(columnId) }

		if (!drafts.settle(batch.rowKey, columnId, draft, refusal)) continue

		const label = batch.labels.get(columnId) ?? String(columnId)

		if (refusal !== null) {
			failed.push(label)

			continue
		}

		saved.push(label)

		accepted.add(columnId)
	}

	return { saved, failed, accepted }
}

/**
 * Drops each reopened draft of a cell-scoped session whose row the consumer
 * closed or deleted, and returns the count. A row that left the set between
 * two sweeps, `before` and `after`, was closed by the consumer unless the
 * grid closed it (`gridClosed`). A row that is no longer in the source rows
 * is deleted. Neither row opens again for the refusal, so its draft would
 * otherwise wait forever. It also forgets each grid close whose row left.
 *
 * @remarks Under server-side pagination a row on another page is absent from
 * the source rows too, and the grid cannot tell it from a deleted row. A held
 * draft there drops as well, because its editor cannot mount. @internal
 */
function dropStrandedHolds<T>(args: {
	drafts: GridDraftStore
	before: Set<string | number>
	after: Set<string | number>
	gridClosed: Set<string | number>
	source: GridEditSource<T>
}): number {
	const { before, after, gridClosed, source } = args

	let keys: Set<string | number> | null = null

	const gone = (rowKey: string | number) => {
		keys ??= new Set(source.rows.map((row, index) => source.getKey(row, index)))

		return !keys.has(rowKey)
	}

	const closed = (rowKey: string | number) =>
		before.has(rowKey) && !after.has(rowKey) && !gridClosed.has(rowKey)

	const dropped = args.drafts.drop(
		(rowKey, _, draft) =>
			draft.reopened && rowKey !== NEW_ROW_KEY && (closed(rowKey) || gone(rowKey)),
	)

	// A grid close is spent once its row leaves the set. A close that has not
	// landed yet, as under a controlled `cell`, stays for a later sweep.
	for (const rowKey of before) if (!after.has(rowKey)) gridClosed.delete(rowKey)

	return dropped
}

/**
 * The error of each refused cell of a settled batch, keyed by column id. A
 * resolved value lists the refused cells, and an empty or absent list accepts
 * the batch. A refusal of a cell outside the batch changes nothing. A
 * rejection refuses every cell, with the reason's `message` when that is a
 * non-empty string. Any other error falls back to {@link COMMIT_REFUSED}.
 * @internal
 */
function readRefusals(
	batch: InFlightBatch,
	outcome: { value: unknown } | { reason: unknown },
): Map<string | number, string> {
	const refused = new Map<string | number, string>()

	if ('reason' in outcome) {
		const message = (outcome.reason as { message?: unknown } | null)?.message

		const error = typeof message === 'string' && message !== '' ? message : COMMIT_REFUSED

		for (const columnId of batch.drafts.keys()) refused.set(columnId, error)

		return refused
	}

	const refusals: GridCellRefusal[] = Array.isArray(outcome.value) ? outcome.value : []

	for (const refusal of refusals) {
		if (refusal.rowKey !== batch.rowKey || !batch.drafts.has(refusal.columnId)) continue

		refused.set(refusal.columnId, refusal.error || COMMIT_REFUSED)
	}

	return refused
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
 * Warns in development when `cell` or `defaultCell` is set outside
 * the cell-scoped, grid-owned session that it binds. The binding is inert there,
 * so it fails silently, which is what the warning is for. @internal
 */
function useActiveCellWithoutScopeWarning(bound: boolean, cellScoped: boolean): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!bound || cellScoped) return

		console.warn(
			"Grid: `editable.cell` and `editable.defaultCell` bind the cell of a cell-scoped session, and this grid has none. The binding has no effect — set `session: 'managed'` and `scope: 'cell'` to bind the cell.",
		)
	}, [bound, cellScoped])
}

/**
 * The commit policy that applies, from the policy the config asks for. The
 * commit on leave needs a session that the grid owns. Under `'manual'` the
 * consumer owns every exit, so the policy reads as `'explicit'`, and a policy
 * that asks for more warns in development. @internal
 */
function useCommitOn(requested: CommitOn | undefined, managed: boolean): CommitOn {
	const asked = requested ?? 'explicit'

	useCommitOnWithoutSessionWarning(asked !== 'explicit', managed)

	return managed ? asked : 'explicit'
}

/**
 * Warns in development when `commitOn` asks for more than `'explicit'` without
 * the grid-owned session that it commits. The consumer owns every exit there,
 * so the setting has no effect and fails silently, which is what the warning
 * is for. @internal
 */
function useCommitOnWithoutSessionWarning(requested: boolean, managed: boolean): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!requested || managed) return

		console.warn(
			"Grid: `editable.commitOn` commits a session that the grid owns, but `editable.session` is 'manual', where you own every exit. The setting has no effect — set `session: 'managed'` to commit a session on leave.",
		)
	}, [requested, managed])
}

/**
 * Whether `node`, an element in the DOM of the table `grid`, is inside what a
 * `commitOn` policy watches. `'leaveGrid'` watches the grid, by the
 * nearest-grid rule. `'leaveEditor'` watches the editors, which `inEditors`
 * names.
 *
 * @internal
 */
function inWatched(args: {
	commitOn: CommitOn
	grid: HTMLElement
	node: Element
	inEditors: (node: Element) => boolean
}): boolean {
	const { commitOn, grid, node, inEditors } = args

	return commitOn === 'leaveGrid' ? isInGrid(node, grid) : inEditors(node)
}

/**
 * What a focus move out of `from` into `next` means to a `commitOn` policy,
 * for the table `grid`: `'stay'`, `'leave'`, or `'ask'`.
 *
 * - A move that does not start inside what the policy watches stays. A
 *   `from` outside the table's DOM reached the table through the React tree.
 *   It is in a surface that the grid renders, so it counts as inside.
 * - A window blur stays. It names no `next` element while the document has
 *   no focus. Any other move with no `next` element goes to the page body,
 *   and leaves.
 * - A `next` in the table's DOM reads by {@link inWatched}.
 * - A `next` outside the table's DOM is `'ask'`. Only the React tree can tell
 *   a surface that the grid renders from an unrelated element, so the focus
 *   event that follows decides.
 *
 * @internal
 */
function readLeave(args: {
	commitOn: CommitOn
	grid: HTMLElement
	from: Element
	next: Element | null
	inEditors: (node: Element) => boolean
}): 'stay' | 'leave' | 'ask' {
	const { grid, from, next } = args

	if (grid.contains(from) && !inWatched({ ...args, node: from })) return 'stay'

	if (next === null) return document.hasFocus() ? 'leave' : 'stay'

	if (!grid.contains(next)) return 'ask'

	return inWatched({ ...args, node: next }) ? 'stay' : 'leave'
}

/**
 * A focus move out of the table's DOM that waits for its focus event. The
 * table's `onFocus` marks it `owned` when the event reaches the table through
 * the React tree. @internal
 */
type PendingLeave = { next: Element; rowKey: string | number; owned: boolean }

/** The development warning for a consumer's cell that is not editable. @internal */
const UNEDITABLE_CELL_WARNING =
	'Grid: `editable.cell` names a cell that is not editable. Its row is unknown, or its column is `readOnly` or has no `field` or `editCell`. The cell reads as null and mounts no editor.'

/**
 * The cell a controlled binding last settled on. `raw` is the value as the
 * consumer passed it; `cell` is that value after the editable check.
 *
 * `wait` is set when `raw` names a cell whose row the transition asked to
 * open. Until that row opens, `cell` is still the cell that the session held
 * before, so a declined rows write leaves the session on it. `wait` holds the
 * new cell and the session row that it lands with. @internal
 */
type SettledCell = {
	raw: GridActiveEdit | null
	cell: GridActiveEdit | null
	wait?: { cell: GridActiveEdit; sessionRow: SessionRow | null }
}

/**
 * The cell that a settled value reads as: the cell it waits for once that
 * row is open, else the cell the session held. @internal
 */
function readSettled(settled: SettledCell, rows: Set<string | number>): GridActiveEdit | null {
	const wait = settled.wait

	return wait && rows.has(wait.cell.rowKey) ? wait.cell : settled.cell
}

/**
 * An uncontrolled entry into a row that is not open yet, made while the
 * session holds a cell. A controlled `rows` can decline the rows write that
 * opens the row. The session then goes back to `from` and its session row,
 * so the declined move changes nothing. @internal
 */
type CrossRowEntry = {
	to: GridActiveEdit
	from: GridActiveEdit
	sessionRow: SessionRow | null
}

/**
 * A move that the grid asked of a controlled `cell`, which waits for the
 * consumer to apply it. `endRows` holds the rows that an exit on the way
 * closes, and `discard` the cell whose draft an Escape drops. `blur` marks a
 * key move that reseats focus before the cell it leaves commits, as the
 * uncontrolled path does at event time. @internal
 */
type CellRequest = {
	to: GridActiveEdit | null
	endRows: Set<string | number>
	discard: GridActiveEdit | null
	blur: boolean
}

/** The row a grid-owned session holds, and whether the session put it in the set. @internal */
type SessionRow = { rowKey: string | number; acquired: boolean }

/**
 * The {@link CrossRowEntry} of an uncontrolled entry, or `null` when the entry
 * opens no row or leaves no held cell. @internal
 */
function crossRowEntry(
	to: GridActiveEdit | null,
	from: GridActiveEdit | null,
	rows: Set<string | number>,
	sessionRow: SessionRow | null,
): CrossRowEntry | null {
	return to && from && !rows.has(to.rowKey) ? { to, from, sessionRow } : null
}

/**
 * Moves the held session row onto the row of `rowKey`. A move within the held
 * row keeps its provenance. A move onto another row records how the session
 * came by it, before the set is written and can no longer answer. `leaving` is
 * the held row when the session acquired it: only that row leaves the set with
 * the session. A borrowed row stays, row-shaped. @internal
 */
function moveSessionRow(
	held: SessionRow | null,
	rowKey: string | number,
	rows: Set<string | number>,
): { leaving: string | number | null; row: SessionRow } {
	if (held?.rowKey === rowKey) return { leaving: null, row: held }

	return {
		leaving: held?.acquired ? held.rowKey : null,
		row: { rowKey, acquired: !rows.has(rowKey) },
	}
}

/**
 * The cell the binding opens the grid with, read once on mount: the controlled
 * value, else the default. A cell that is not editable opens nothing, and is
 * flagged for the development warning. @internal
 */
function readInitialCell<T>(
	config: GridEditableConfig | undefined,
	cellScoped: boolean,
	source: GridEditSource<T>,
): { cell: GridActiveEdit | null; uneditable: boolean } {
	const named = config?.cell !== undefined ? config.cell : config?.defaultCell

	if (!cellScoped || named == null) return { cell: null, uneditable: false }

	const editable = isEditableCell(named, source)

	return { cell: editable ? named : null, uneditable: !editable }
}

/**
 * The cell a controlled binding reads as in this render. A value the transition
 * effect has settled reads as it settled (see {@link readSettled}). A new value
 * reads at once when its row is open and its cell is editable. Otherwise the
 * settled cell stays until the effect opens the row, so no row widens for a
 * render. @internal
 */
function readControlledCell<T>(
	raw: GridActiveEdit | null,
	settled: SettledCell,
	rows: Set<string | number>,
	source: GridEditSource<T>,
): GridActiveEdit | null {
	const held = readSettled(settled, rows)

	if (sameCell(raw, settled.raw)) return held

	return raw !== null && rows.has(raw.rowKey) && isEditableCell(raw, source) ? raw : held
}

/** What the transition effect does for one new value of a controlled binding. @internal */
type TransitionPlan = {
	/** The value after the editable check. */
	next: GridActiveEdit | null
	/** Whether the grid asked for this value, rather than the consumer set it. */
	asked: boolean
	/** The rows the transition closes, as a save does. */
	endRows: Set<string | number>
	/** The acquired row the session leaves. */
	leaving: string | number | null
	/** The session row after the transition. */
	sessionRow: SessionRow | null
	/** Whether the new cell's row is not open yet. */
	opens: boolean
	/** Whether the transition writes the set at all. */
	writesRows: boolean
	/** The cell whose draft an asked-for Escape drops. */
	discard: GridActiveEdit | null
}

/**
 * Plans the transition from the settled cell to a new controlled value. It
 * follows the rules of a grid entry and exit. `null` closes the held row, as a
 * save does. @internal
 */
function planTransition<T>(args: {
	from: SettledCell
	raw: GridActiveEdit | null
	request: CellRequest | null
	rows: Set<string | number>
	sessionRow: SessionRow | null
	source: GridEditSource<T>
}): TransitionPlan {
	const { from, raw, request, rows } = args

	const next = raw !== null && isEditableCell(raw, args.source) ? raw : null

	const asked = request !== null && sameCell(request.to, raw)

	const endRows = new Set(asked ? request.endRows : [])

	if (next === null && from.cell !== null && rows.has(from.cell.rowKey))
		endRows.add(from.cell.rowKey)

	const held =
		args.sessionRow !== null && endRows.has(args.sessionRow.rowKey) ? null : args.sessionRow

	const move = next === null ? null : moveSessionRow(held, next.rowKey, rows)

	const leaving = move?.leaving ?? null

	const opens = next !== null && !rows.has(next.rowKey)

	return {
		next,
		asked,
		endRows,
		leaving,
		sessionRow: move?.row ?? held,
		opens,
		writesRows: endRows.size > 0 || leaving !== null || opens,
		discard: asked ? request.discard : null,
	}
}

/**
 * The editable-row set after a {@link TransitionPlan}, or after one part of
 * it. The `'exit'` step closes only the rows of the exits. The `'entry'` step
 * applies the rest. @internal
 */
function applyRowsPlan(
	prev: Set<string | number> | undefined,
	plan: TransitionPlan,
	step: 'exit' | 'entry' | 'all',
): Set<string | number> {
	const set = new Set(prev ?? EMPTY_SET)

	if (step !== 'entry') for (const row of plan.endRows) set.delete(row)

	if (step === 'exit') return set

	if (plan.leaving !== null) set.delete(plan.leaving)

	return plan.next ? set.add(plan.next.rowKey) : set
}

/**
 * The settled cell after a {@link TransitionPlan} acts on `raw`. `held` is the
 * cell that the session held before. A value whose row is not open yet waits
 * for it. The session keeps its held cell until that row opens, so a declined
 * rows write changes nothing. An exit on the way still closes its row, so the
 * session does not keep a cell that the exit closed. @internal
 */
function settleOn(
	plan: TransitionPlan,
	raw: GridActiveEdit | null,
	held: GridActiveEdit | null,
): SettledCell {
	if (!plan.opens || !plan.next) return { raw, cell: plan.next }

	return {
		raw,
		cell: held && plan.endRows.has(held.rowKey) ? null : held,
		wait: { cell: plan.next, sessionRow: plan.sessionRow },
	}
}

/**
 * Writes the rows of a {@link TransitionPlan}. An exit that comes with an
 * entry into a row that is not open is two writes, the exit and then the
 * entry. That is the order of Enter under an uncontrolled cell. A `rows`
 * binding that declines the entry therefore keeps the commit of the exit.
 * Any other plan is one write. Each row that the plan closes goes into
 * `gridClosed`, so the sweep does not read it as closed by the consumer.
 * @internal
 */
function writeRowsPlan(
	plan: TransitionPlan,
	setRows: (update: (prev: Set<string | number> | undefined) => Set<string | number>) => void,
	gridClosed: Set<string | number>,
): void {
	if (!plan.writesRows) return

	for (const row of plan.endRows) gridClosed.add(row)

	if (plan.leaving !== null) gridClosed.add(plan.leaving)

	if (plan.opens && plan.endRows.size > 0) {
		setRows((prev) => applyRowsPlan(prev, plan, 'exit'))

		setRows((prev) => applyRowsPlan(prev, plan, 'entry'))

		return
	}

	setRows((prev) => applyRowsPlan(prev, plan, 'all'))
}

/**
 * Resolves the session's cell against the set. It owns the `cell`
 * controllable, the value the transition effect settled, and the mask of an
 * uncontrolled coord that stranded. @internal
 */
function useActiveCell<T>({
	config,
	cellScoped,
	controlled,
	initialCell,
	editableRows,
	editSourceRef,
	entryRef,
}: {
	config: GridEditableConfig | undefined
	cellScoped: boolean
	controlled: boolean
	initialCell: GridActiveEdit | null
	editableRows: Set<string | number>
	editSourceRef: RefObject<GridEditSource<T>>
	entryRef: RefObject<CrossRowEntry | null>
}) {
	// The session's cell as the binding holds it, before the grid resolves it
	// against the set. Uncontrolled, the grid writes it at event time. Controlled,
	// the consumer writes it, and the grid only asks through the change report.
	const [value, setValue] = useControllable<GridActiveEdit>({
		value: cellScoped ? config?.cell : undefined,
		defaultValue: initialCell ?? undefined,
		onValueChange: (next) => config?.onCellChange?.(next),
	})

	const raw = value ?? null

	// The last value of a controlled binding that the transition effect acted on.
	// A value past it is in flight: the effect has yet to write the rows it needs.
	const settledRef = useRef<SettledCell>({ raw: initialCell, cell: initialCell })

	const candidate = controlled
		? readControlledCell(raw, settledRef.current, editableRows, editSourceRef.current)
		: raw

	// An uncontrolled coord that stranded once stays dropped. Masking alone would
	// survive as state, so the same row re-entering the set later would revive a
	// cell nobody opened and mount its editor alone. The grid cannot clear the
	// state here without a change report, so it records the stranded value
	// instead. A controlled value is the consumer's own, so it reads again when
	// its row opens again.
	const [maskedCell, setMaskedCell] = useState<GridActiveEdit | null>(null)

	const masked = !controlled && candidate !== null && candidate === maskedCell

	// Three things strand the coord. A binding can decline an entry, so the row
	// never joins the set; a consumer save can drop an editing row from under the
	// session; and `scope` or `session` can change under a live session, which
	// leaves a coord the current config would never have written.
	const stranded =
		candidate !== null && !masked && (!cellScoped || !editableRows.has(candidate.rowKey))

	// A cross-row entry that the rows binding declined reads as the cell it left,
	// while that cell's row is still open. The transition effect then writes the
	// state back to it, so no mask is necessary.
	const entry = entryRef.current

	const declined =
		stranded &&
		!controlled &&
		cellScoped &&
		entry !== null &&
		sameCell(candidate, entry.to) &&
		editableRows.has(entry.from.rowKey)

	// Adjusting the state here is React's answer to a value gone stale against its
	// input, and it beats an effect that resynchronizes a render late.
	if (stranded && !controlled && !declined) setMaskedCell(candidate)

	const activeEdit = declined ? entry.from : stranded || masked ? null : candidate

	return { raw, setValue, settledRef, activeEdit }
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
 * The drafts belong to the session, in one {@link GridDraftStore} keyed by
 * cell. A draft lives while its cell is open. An editor that unmounts, for
 * virtualization, a page change, a hidden column, or grouping, neither commits
 * nor drops it. An editor that mounts again shows it. A row that left the
 * grid's data when its session closes commits against the row snapshot that
 * each draft keeps. A write to a cell that the session closed is ignored.
 * An async `onCommit` holds its batch's drafts in the same store as pending
 * until the promise settles. A refused draft is staged again, with its error.
 *
 * The active cell is a controllable of its own (`cell`). Uncontrolled, the
 * grid writes it at event time, as before. Controlled, the grid only asks for
 * each move. A layout effect acts on each new value, from the grid or from the
 * consumer. It writes the rows that the value needs.
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
	tableRef,
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
	/** The grid `<table>`, the tab stop that a session exit reseats focus on. */
	tableRef: RefObject<HTMLTableElement | null>
	/** The cursor's per-cell id deriver; locates the entered cell's editor to focus it. */
	cellId: (row: number, col: number) => string
	/** The cursor's clamped move, which the commit-and-move keys ride. */
	moveTo: (coord: Coord) => void
}): GridEditingApi {
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

	useActiveCellWithoutScopeWarning(
		enabled && (config?.cell !== undefined || config?.defaultCell !== undefined),
		cellScoped,
	)

	const commitOn = useCommitOn(enabled ? config?.commitOn : undefined, managed)

	// The new-row slot, where the config can show it. Its cells always take a
	// write, so the draft store reads this at write time.
	const newRowPosition = resolveNewRow(config, managed)

	const newRowOpenRef = useRef(false)

	newRowOpenRef.current = newRowPosition !== null

	// A consumer's `cell` decides each move of the session's cell. The
	// binding applies only where that cell exists.
	const controlled = cellScoped && config?.cell !== undefined

	// The cell the session opens with, from the binding's first value. Read once:
	// it seeds the uncontrolled state, and the row it needs seeds `defaultRows`.
	const [initial] = useState(() => readInitialCell(config, cellScoped, editSourceRef.current))

	// The editable-row set is consumer-driven by default — the grid renders no
	// built-in entry and only reads the binding (a row-action button flips a
	// key). Under `session: 'managed'` the grid also writes it, through the
	// session callbacks below, so every entry/exit still emits `onRowsChange`.
	// An initial active cell opens its row with the default, so the mount reports
	// nothing. A controlled `rows` gets no such seed, and without the row the cell
	// stays closed.
	const [editableRowsRaw, setEditableRows] = useControllable<Set<string | number>>({
		value: config?.rows,
		defaultValue: () => {
			const base = config?.defaultRows ?? EMPTY_SET

			const cell = initial.cell

			return cell === null || base.has(cell.rowKey) ? base : new Set(base).add(cell.rowKey)
		},
		onValueChange: (next) => config?.onRowsChange?.(next ?? EMPTY_SET),
	})

	const editableRows = enabled ? (editableRowsRaw ?? EMPTY_SET) : EMPTY_SET

	// The last uncontrolled cross-row entry, until the transition effect sees
	// whether the rows binding applied it.
	const entryRef = useRef<CrossRowEntry | null>(null)

	const {
		raw,
		setValue: setActiveCellValue,
		settledRef,
		activeEdit,
	} = useActiveCell({
		config,
		cellScoped,
		controlled,
		initialCell: initial.cell,
		editableRows,
		editSourceRef,
		entryRef,
	})

	// The cell a cell-scoped session edits; null under row scope. The hook's own
	// effects read `activeEdit`: the commit sweep and the transition. The cells
	// read the store, each subscribed to its own flag, so a move along a row
	// renders two cells rather than the whole window.
	const storeRef = useRef<ReturnType<typeof createActiveEditStore> | null>(null)

	if (storeRef.current === null) storeRef.current = createActiveEditStore()

	const activeEditStore = storeRef.current

	// Seat the resolved coord and rows for the cells that render in this pass.
	// The other cells hear of them in the layout effect below. An uncontrolled
	// write of the coord reached the store at event time already, so both are
	// no-ops for it.
	activeEditStore.seat(activeEdit, editableRows)

	useLayoutEffect(() => {
		activeEditStore.setRows(editableRows)

		activeEditStore.set(activeEdit)
	}, [activeEdit, editableRows, activeEditStore])

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeEditRef = useRef(activeEdit)

	activeEditRef.current = activeEdit

	// The sinks, read as effect events, so a new callback does not run the sweep
	// again. Whether `onCommit` is present stays in the deps: a sink that went
	// with its binding commits nothing, and nothing is announced.
	const hasCommit = config?.onCommit !== undefined

	const sendCommit = useEffectEvent((changes: GridCellChange[]) => config?.onCommit(changes))

	const sendReject = useEffectEvent((refused: GridCellChange[]) => config?.onReject?.(refused))

	// The undo history, when the config turns it on.
	const history = useGridEditHistory(enabled, config?.history, config?.onHistoryChange)

	const { record: recordEntry, take: takeStep } = history

	// The open state that the last commit sweep saw. A cell that it saw open
	// has not committed yet, so a write to it still counts.
	const sweptRef = useRef<{ rows: Set<string | number>; cell: GridActiveEdit | null }>({
		rows: EMPTY_SET,
		cell: null,
	})

	// The session's drafts, keyed by cell. The session owns them, not the
	// editors: a draft lives while its cell is open, mounted or not. The store
	// has no subscribers, so staging never re-renders the grid. It takes a
	// write only for a cell that is open now, or that the last sweep saw open.
	// A later write, such as a blur after a save, is too late to commit.
	const draftsRef = useRef<GridDraftStore | null>(null)

	if (draftsRef.current === null)
		draftsRef.current = createDraftStore((rowKey, columnId) =>
			rowKey === NEW_ROW_KEY
				? newRowOpenRef.current
				: isCellEditing({
						rowKey,
						columnId,
						editableRows: editableRowsRef.current,
						activeEdit: activeEditRef.current,
					}) ||
					isCellEditing({
						rowKey,
						columnId,
						editableRows: sweptRef.current.rows,
						activeEdit: sweptRef.current.cell,
					}),
		)

	const drafts = draftsRef.current

	const stageDraft = drafts.stage

	const unstageDraft = drafts.unstage

	const readDraft = drafts.read

	// Whether the cell's commit is in flight. Such a cell cannot open.
	const isPending = useCallback(
		(rowKey: string | number, columnId: string | number) =>
			drafts.read(rowKey, columnId)?.status === 'pending',
		[drafts],
	)

	// The cell whose editor takes focus once it mounts. The entry sets it, and the
	// editor claims it as it mounts or as the session comes to hold it. A
	// controlled binding can delay that mount by a consumer round-trip.
	const pendingFocusRef = useRef<GridActiveEdit | null>(null)

	// The value a type-to-edit entry opens its editor with, beside the focus
	// intent and cleared with it. The editor reads it once, as it mounts.
	const pendingSeedRef = useRef<(GridActiveEdit & { value?: string | number }) | null>(null)

	const entrySeed = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingSeedRef.current

		return pending && isSameCell(pending, { rowKey, columnId }) ? pending.value : undefined
	}, [])

	const dropIntents = useCallback(() => {
		pendingFocusRef.current = null

		pendingSeedRef.current = null
	}, [])

	// Called by an editor as it mounts, and as the session comes to hold it. It
	// takes the focus intent when the intent names its cell and that cell is
	// open. The editor then focuses itself. It knows its own element, so no
	// display coord travels from the entry, and a re-sort cannot misplace it.
	const claimFocus = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const pending = pendingFocusRef.current

			if (!pending || !isSameCell(pending, { rowKey, columnId })) return false

			const open = isCellEditing({
				rowKey,
				columnId,
				editableRows: editableRowsRef.current,
				activeEdit: activeEditRef.current,
			})

			if (open) dropIntents()

			return open
		},
		[dropIntents],
	)

	// Set when a transition opens a row this commit, so the drop below waits one
	// render for the row to arrive.
	const awaitRowRef = useRef(false)

	// Drop a focus intent whose cell the session does not hold, after each render.
	// A binding declined the entry, or the session moved on. Without this the
	// intent would steal focus at the next, unrelated open of that cell. An open
	// cell keeps its intent: its editor claims it as it mounts, which under a
	// controlled binding is the render after this one.
	useEffect(() => {
		if (awaitRowRef.current) {
			awaitRowRef.current = false

			return
		}

		const pending = pendingFocusRef.current

		if (pending && !isCellEditing({ ...pending, editableRows, activeEdit })) dropIntents()
	})

	// Set while the grid moves focus itself, so the commit on leave does not
	// read the grid's own reseat as a user who left the editor.
	const reseatingRef = useRef(false)

	// Reseats focus on the tab stop (see `restoreGridFocus`), marked as the
	// grid's own move for the commit on leave.
	const reseat = useCallback(() => {
		reseatingRef.current = true

		try {
			restoreGridFocus(tableRef.current)
		} finally {
			reseatingRef.current = false
		}
	}, [tableRef])

	const newRow = useGridNewRow<T>({
		config,
		managed,
		position: newRowPosition,
		drafts,
		editSourceRef,
		dataColumnsRef,
		tableRef,
		reseat,
		cellId,
		moveTo,
	})

	// Moves focus for one transition of a controlled binding. A value set from
	// outside replaces the intents of any entry, and focus follows it into the
	// grid only when focus is already there (WCAG 3.2.1). Focus in a grid nested
	// in a detail row is not in this grid (see `isInGrid`). The leaving editor
	// blurs while it is still mounted, so a value it stages on blur reaches the
	// draft before the sweep commits the cell. A move the grid asked for blurs
	// where the uncontrolled path does: on a key move or an exit.
	const settleFocus = useCallback(
		(plan: TransitionPlan, blur: boolean) => {
			const focused = isInGrid(document.activeElement, tableRef.current)

			if (!plan.asked) {
				dropIntents()

				if (plan.next && focused) pendingFocusRef.current = plan.next
			}

			if (plan.asked ? blur : focused) reseat()
		},
		[dropIntents, reseat, tableRef],
	)

	// Warns once for a consumer's cell that is not editable: the initial value
	// here, and each later value in the transition effect below.
	const warnedRef = useRef(false)

	const warnUneditable = useCallback(() => {
		if (process.env.NODE_ENV === 'production' || warnedRef.current) return

		warnedRef.current = true

		console.warn(UNEDITABLE_CELL_WARNING)
	}, [])

	useEffect(() => {
		if (initial.uneditable) warnUneditable()
	}, [initial.uneditable, warnUneditable])

	// The row the grid-owned session holds, with how it came by it. Row scope
	// keeps no coord, and Escape has to reach the session from anywhere in the
	// grid under both scopes, so the row is recorded here rather than read off
	// `activeEdit`. Provenance rides the row because the row is its subject: read
	// off the cell it would be recomputed on every move, and a move within an
	// acquired row would find that row already in the set and forget the session
	// had put it there. An initial cell's row counts as acquired when neither
	// `rows` nor `defaultRows` held it.
	const sessionRowRef = useRef<SessionRow | null>(
		initial.cell && {
			rowKey: initial.cell.rowKey,
			acquired: !(config?.rows ?? config?.defaultRows ?? EMPTY_SET).has(initial.cell.rowKey),
		},
	)

	// The move a controlled binding has yet to apply, and a counter that forces
	// the render which tells an applied move from a declined one.
	const requestRef = useRef<CellRequest | null>(null)

	const [tick, bump] = useReducer((count: number) => count + 1, 0)

	// The rows that the grid itself closed since the last sweep: a session exit,
	// or an acquired row that the session leaves. The sweep reads any other row
	// that left the set as closed by the consumer.
	const gridClosedRef = useRef(new Set<string | number>())

	// Asks a controlled binding for a move: it reports the cell, and records what
	// the move needs once the consumer applies it. `exit` names the row that an
	// exit on the way closes. The counter forces the render that settles it.
	const requestCell = useCallback(
		(
			next: GridActiveEdit | null,
			exit?: { rowKey: string | number; discard: boolean; reseat: boolean },
		) => {
			const current = activeEditRef.current

			const request = requestRef.current ?? {
				to: current,
				endRows: new Set(),
				discard: null,
				blur: false,
			}

			request.to = next

			// An exit reseats focus, as `endSession` does at event time uncontrolled.
			// A commit on leave does not, because focus already went elsewhere.
			if (exit) request.endRows.add(exit.rowKey)

			if (exit?.reseat) request.blur = true

			if (exit?.discard) request.discard = current

			requestRef.current = request

			activeEditRef.current = next

			setActiveCellValue(next)

			bump()
		},
		[setActiveCellValue],
	)

	// Writes the session's cell for a move the grid makes. Uncontrolled, the move
	// lands now: the state, the store, and the report, ahead of any rows write.
	// Controlled, the grid only asks, and the transition effect acts on the move
	// once the consumer applies it.
	const writeActiveCell = useCallback(
		(next: GridActiveEdit | null) => {
			if (sameCell(activeEditRef.current, next)) return

			if (controlled) {
				requestCell(next)

				return
			}

			activeEditRef.current = next

			setActiveCellValue(next)

			activeEditStore.set(next)
		},
		[controlled, requestCell, setActiveCellValue, activeEditStore],
	)

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
			const here = entering ? isSameCell(active, entering) : editableRows.has(rowKey)

			// A cell whose commit is in flight cannot open, so no second batch for
			// it can start before the first settles.
			if (here || isPending(rowKey, columnId)) return

			pendingFocusRef.current = { rowKey, columnId }

			pendingSeedRef.current = { rowKey, columnId, value: seed }

			// A controlled binding decides the move. The rows it needs follow once
			// the consumer applies the cell, so a declined move writes nothing.
			if (controlled) {
				writeActiveCell(entering)

				return
			}

			const move = moveSessionRow(sessionRowRef.current, rowKey, editableRows)

			// Row scope names no cell, so it leaves no row behind.
			const leaving = entering ? move.leaving : null

			// A controlled `rows` can decline the row that this entry opens. Record
			// where the session was, so that a decline puts it back there.
			entryRef.current = crossRowEntry(entering, active, editableRows, sessionRowRef.current)

			sessionRowRef.current = move.row

			// The cell goes first, then the rows: `onCellChange` reports ahead of
			// the `onRowsChange` that opens its row.
			writeActiveCell(entering)

			// The set is unchanged when the session moves along one row, or moves off a
			// borrowed row onto one already in the set. Writing it anyway would
			// announce a transition that never happened, because the controllable
			// emits `onRowsChange` on every write, equal or not.
			if (leaving === null && editableRows.has(rowKey)) return

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				// The row a cell-scoped session leaves exits the set, and the flush
				// sweep commits what it staged there.
				if (leaving !== null) {
					gridClosedRef.current.add(leaving)

					next.delete(leaving)
				}

				return next.add(rowKey)
			})
		},
		[cellScoped, controlled, isPending, setEditableRows, writeActiveCell],
	)

	// Drops the drafts that a discard abandons. A cell-scoped session abandons
	// the cell it sits on. The cells it visited before that one committed as it
	// left them, so their values are not the session's to discard. Row scope
	// drops the whole row's drafts. Neither asks which editors are mounted.
	const discardDrafts = useCallback(
		(rowKey: string | number, cell: GridActiveEdit | null) => {
			if (cell) drafts.unstage(rowKey, cell.columnId)
			else drafts.unstageRow(rowKey)
		},
		[drafts],
	)

	/**
	 * Ends a grid-owned session on `rowKey`. It reseats focus on the grid's tab
	 * stop and drops the row from the set. The flush sweep then commits the
	 * editors that closed with it. `'discard'` drops the session's staged values
	 * ahead of the sweep, so it finds nothing left to emit. Under a controlled
	 * `cell`, an exit from the held cell waits for the consumer to apply
	 * `null`; the transition effect then does all of this. A commit on leave
	 * passes `reseatFocus: false`, because focus already went where the user
	 * sent it.
	 */
	const exitSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard', reseatFocus: boolean) => {
			if (!editableRowsRef.current.has(rowKey)) return

			// The active cell only concerns this call when it sits on this row.
			const cell = activeEditRef.current?.rowKey === rowKey ? activeEditRef.current : null

			if (cell && controlled) {
				requestCell(null, { rowKey, discard: outcome === 'discard', reseat: reseatFocus })

				return
			}

			// Reseat focus ahead of the discard, not after. An editor blurred on the
			// way out can stage one last value; `NumberInput` commits its typed text
			// there. That write must not outlive the values being dropped.
			if (reseatFocus) reseat()

			if (outcome === 'discard') discardDrafts(rowKey, cell)

			if (sessionRowRef.current?.rowKey === rowKey) sessionRowRef.current = null

			gridClosedRef.current.add(rowKey)

			// Two things end a session, and each clears the coord its own way. This
			// exit is one. The other is a consumer withdrawing the row from under it,
			// which the derivation above catches: a coord off the set reads as no
			// session at all. The cell reports first, then the rows.
			if (cell) writeActiveCell(null)

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[controlled, requestCell, discardDrafts, setEditableRows, writeActiveCell, reseat],
	)

	// The session's own exit, from its keys, its settle controls, and a slot's
	// `commit`. Each reseats focus on the tab stop.
	const endSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard') => exitSession(rowKey, outcome, true),
		[exitSession],
	)

	// Acts on each new value of a controlled `cell`, whether the grid asked
	// for it or the consumer set it. It runs as a layout effect, so the editor the
	// value names is open before paint.
	//
	// - A value equal to the settled one moves nothing. A request that did not
	//   land was declined, so its intents drop.
	// - A value the grid asked for keeps the intents of its entry, and carries out
	//   the exits and the discard recorded with it.
	// - Any other value is a set from outside. Focus follows it into the grid only
	//   when focus is already there (WCAG 3.2.1).
	//
	// The rows follow the rules of a grid entry. The new cell's row opens, and a
	// row the session acquired closes as the session leaves it. `null` closes
	// the held row, as a save does.
	const applyTransition = useCallback(
		(raw: GridActiveEdit | null, from: SettledCell, request: CellRequest | null) => {
			const rows = editableRowsRef.current

			const plan = planTransition({
				from,
				raw,
				request,
				rows,
				sessionRow: sessionRowRef.current,
				source: editSourceRef.current,
			})

			if (raw !== null && plan.next === null) warnUneditable()

			settledRef.current = settleOn(plan, raw, readSettled(from, rows))

			settleFocus(plan, request?.blur === true)

			if (plan.discard) unstageDraft(plan.discard.rowKey, plan.discard.columnId)

			// A waiting value keeps the session row until its row opens. An exit on
			// the way still takes the row that it closes.
			const sessionRow = sessionRowRef.current

			if (!plan.opens) sessionRowRef.current = plan.sessionRow
			else if (sessionRow && plan.endRows.has(sessionRow.rowKey)) sessionRowRef.current = null

			writeRowsPlan(plan, setEditableRows, gridClosedRef.current)

			// The render held the settled cell while this value waited for its row. A
			// render must follow, even where the consumer declines the rows write.
			if (raw === null || !rows.has(raw.rowKey)) bump()

			awaitRowRef.current = plan.opens
		},
		[settledRef, editSourceRef, warnUneditable, settleFocus, unstageDraft, setEditableRows],
	)

	// Lands a settled value that waits for its row, once that row is open. The
	// session then holds the new cell and the session row that it planned.
	const landWait = useCallback((): SettledCell => {
		const settled = settledRef.current

		const wait = settled.wait

		if (!wait || !editableRowsRef.current.has(wait.cell.rowKey)) return settled

		sessionRowRef.current = wait.sessionRow

		settledRef.current = { raw: settled.raw, cell: wait.cell }

		return settledRef.current
	}, [settledRef])

	const settleBinding = useCallback(
		(raw: GridActiveEdit | null) => {
			const request = requestRef.current

			requestRef.current = null

			if (!controlled) {
				const entry = entryRef.current

				entryRef.current = null

				// The render read a declined entry as the cell it left. Write the
				// state back to that cell, and report it, as the entry was reported.
				if (entry && sameCell(raw, entry.to) && sameCell(activeEditRef.current, entry.from)) {
					sessionRowRef.current = entry.sessionRow

					setActiveCellValue(entry.from)
				}

				settledRef.current = { raw: activeEditRef.current, cell: activeEditRef.current }

				return
			}

			const from = landWait()

			// An equal value moves nothing. A request that did not land was declined.
			if (!sameCell(raw, from.raw)) applyTransition(raw, from, request)
			else if (request) dropIntents()
		},
		[controlled, settledRef, applyTransition, dropIntents, landWait, setActiveCellValue],
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: `tick` re-runs the transition after each request, so a declined move drops its intents. `editableRows` lands a waiting value once its row opens.
	useLayoutEffect(() => settleBinding(raw), [raw, tick, editableRows, settleBinding])

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

				if (editor) focusWithoutReveal(editor)

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
			if (claimedBySurface(event) || readKeyPress(event).composing || newRow.keys(event)) return

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
		[endSession, sessionTarget, runMove, newRow.keys],
	)

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
		[sessionTarget],
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
	const sessionLeave = useCallback(
		(event: ReactFocusEvent<HTMLTableElement>) => {
			if (reseatingRef.current || commitOn === 'explicit') return

			const from = event.target

			const grid = event.currentTarget

			const rowKey = leaveRow(from, grid)

			if (rowKey === null) return

			const inEditors = (node: Element) => {
				const hit = isInGrid(node, grid) ? sessionTarget(node) : null

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
		[commitOn, leaveRow, sessionTarget, exitSession, settleLeave],
	)

	// Marks a pending leave as owned when its focus event reaches the table
	// through the React tree. Only a surface that the grid renders does that.
	const sessionFocus = useCallback((event: ReactFocusEvent<HTMLTableElement>) => {
		const pending = pendingLeaveRef.current

		if (pending && event.target === pending.next) pending.owned = true
	}, [])

	// The settle controls a cell shows, decided here rather than in the cell. The
	// cell a cell-scoped session holds shows them. Under `'leaveEditor'` a move
	// away saves, so a save control is redundant and only discard shows.
	const settleControls = useCallback(
		(rowKey: string | number, columnId: string | number): GridSettleControls => {
			if (!cellScoped || !isSameCell(activeEditStore.get(), { rowKey, columnId })) return 'none'

			return commitOn === 'leaveEditor' ? 'discard' : 'both'
		},
		[cellScoped, commitOn, activeEditStore],
	)

	// Moves a cell-scoped session onto a refused cell that the refusal opened
	// beside it, as focus moves into its editor. Focus is already there, so the
	// entry leaves no focus intent.
	const resumeCell = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			if (!cellScoped) return

			enterEdit(rowKey, columnId)

			dropIntents()
		},
		[cellScoped, enterEdit, dropIntents],
	)

	// Whether the grid is mounted. A commit that settles after the unmount
	// changes nothing and announces nothing.
	const mountedRef = useRef(false)

	useEffect(() => {
		mountedRef.current = true

		return () => {
			mountedRef.current = false
		}
	}, [])

	// The refused rows that a settle asked `rows` to open again, and a counter
	// that forces the render which tells an applied write from a declined one.
	const awaitingReopenRef = useRef(new Set<string | number>())

	const [, rerender] = useReducer((count: number) => count + 1, 0)

	// A controlled `rows` that declines to open a refused row again chose to
	// close it, so the refused drafts of that row drop. Without this, they
	// would commit again at the next sweep of an unrelated transition.
	useEffect(() => {
		const awaiting = awaitingReopenRef.current

		if (awaiting.size === 0) return

		const declined = new Set([...awaiting].filter((row) => !editableRows.has(row)))

		awaiting.clear()

		if (declined.size === 0) return

		const dropped = drafts.drop(
			(rowKey, _, draft) =>
				rowKey !== NEW_ROW_KEY && declined.has(rowKey) && draft.error !== undefined,
		)

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announce(describeDiscard(dropped))
		}
	})

	// Settles one async batch. An accepted draft leaves the store, and the cell
	// reads the row again. A refused draft is staged again, with its error, and
	// focus stays where it is. Under row scope the refused row opens again.
	// Under cell scope a refused cell opens beside the session, unless the
	// session holds it. One polite announcement speaks the batch.
	const settleBatch = useCallback(
		(batch: InFlightBatch, refused: Map<string | number, string>) => {
			if (!mountedRef.current) return

			const { rowKey } = batch

			// A cell-scoped session holds one cell, so a refused cell opens beside
			// it. A cell that the session holds already needs no mark.
			const reopen = (columnId: string | number) =>
				cellScoped &&
				!isCellEditing({
					rowKey,
					columnId,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				})

			const { saved, failed, accepted } = settleDrafts({ batch, refused, drafts, reopen })

			if (saved.length + failed.length === 0) return

			activeEditStore.notify()

			// An accepted save goes into the history. An undo or a redo moved its
			// entry when it was sent.
			if (batch.outcome === 'updated') {
				recordEntry(batch.history.filter((cell) => accepted.has(cell.columnId)))
			}

			if (failed.length > 0 && !cellScoped && !editableRowsRef.current.has(rowKey)) {
				awaitingReopenRef.current.add(rowKey)

				setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))

				// A render must follow even when a controlled `rows` declines the
				// write, so the check below sees the decline.
				rerender()
			}

			announce(describeSettle(saved, failed, batch.row, batch.outcome))
		},
		[cellScoped, drafts, activeEditStore, setEditableRows, recordEntry],
	)

	// Puts the drafts of an async batch back as pending, and settles them when
	// the promise does. A rejection refuses the whole batch.
	const trackBatch = useCallback(
		(batch: InFlightBatch) => {
			for (const [columnId, draft] of batch.drafts) drafts.pend(batch.rowKey, columnId, draft)

			activeEditStore.notify()

			batch.result.then(
				(value) => settleBatch(batch, readRefusals(batch, { value })),
				(reason: unknown) => settleBatch(batch, readRefusals(batch, { reason })),
			)
		},
		[drafts, activeEditStore, settleBatch],
	)

	// Read by the sweep, so a new callback does not run the sweep again.
	const trackInFlight = useEffectEvent((batch: InFlightBatch) => trackBatch(batch))

	// Commit the cells that the session closed in the render just past. The
	// drafts belong to the session, and this is where they land in the sink. The
	// open state answers it on its own, so no copy of the last render is kept to
	// diff against.
	useEffect(() => {
		const dropped = dropStrandedHolds({
			drafts,
			before: sweptRef.current.rows,
			after: editableRows,
			gridClosed: gridClosedRef.current,
			source: editSourceRef.current,
		})

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announce(describeDiscard(dropped))
		}

		sweptRef.current = { rows: editableRows, cell: activeEdit }

		const { saved, inFlight } = flushClosedCells({
			drafts,
			editableRows,
			activeEdit,
			source: editSourceRef.current,
			onCommit: hasCommit ? sendCommit : undefined,
			onReject: sendReject,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3). An
		// async batch announces as it settles.
		if (saved.columns.length > 0) announce(describeCommit(saved.columns, saved.row))

		// One sweep is one user action, so its cells are one entry. An async
		// batch goes into the history as it settles.
		recordEntry(saved.history)

		for (const batch of inFlight) trackInFlight(batch)
	}, [drafts, editableRows, activeEdit, editSourceRef, activeEditStore, recordEntry, hasCommit])

	// Moves the cursor to a cell that a history step wrote, when the grid shows
	// its row and its column.
	const moveToCell = useCallback(
		(cell: GridHistoryCell | undefined) => {
			const row = cell ? rowKeysRef.current.indexOf(cell.rowKey) : -1

			const col = dataColumnsRef.current.findIndex((column) => column.id === cell?.columnId)

			if (row !== -1 && col !== -1) moveTo({ row, col })
		},
		[rowKeysRef, dataColumnsRef, moveTo],
	)

	// Takes one step through the history, and returns whether it wrote a cell.
	// The step sends the values that it writes through `onCommit`, as a save
	// does, so the consumer applies it as it applies a save. From a key, the
	// cursor moves to the first cell that the step writes, when the grid shows
	// its row and its column. With the history off, nothing happens.
	const stepHistory = useCallback(
		(step: GridHistoryStep, moveCursor: boolean): boolean => {
			if (!history.on) return false

			const source = editSourceRef.current

			const result = takeStep(step, {
				current: (cell) => readHistoryCell(source, cell),
				drafted: (cell) => drafts.read(cell.rowKey, cell.columnId) !== undefined,
			})

			if (result.status !== 'applied') {
				announce(describeHistoryMiss(step, result.status))

				return false
			}

			const { cells } = result

			const { saved, inFlight } = sendHistory({
				cells,
				step,
				source,
				onCommit: hasCommit ? sendCommit : undefined,
			})

			if (saved.columns.length > 0) {
				announce(describeCommit(saved.columns, saved.row, historyOutcome(step)))
			}

			for (const batch of inFlight) trackBatch(batch)

			if (moveCursor) moveToCell(cells[0])

			return true
		},
		[history.on, editSourceRef, takeStep, drafts, hasCommit, trackBatch, moveToCell],
	)

	// The step of the grid's `ref` handle. Focus is on the control that sent it,
	// so the cursor stays where it is.
	const stepFromHandle = useCallback(
		(step: GridHistoryStep) => stepHistory(step, false),
		[stepHistory],
	)

	// The history keys act on the tab stop only. In an open editor, the input
	// keeps Ctrl+Z for its own text. The keys are absent while the history is off.
	const historyKeys = useMemo(() => {
		if (!history.on) return undefined

		return (event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget || event.defaultPrevented) return

			const step = historyStep({ ...readKeyPress(event), shiftKey: event.shiftKey })

			if (step === null) return

			event.preventDefault()

			stepHistory(step, true)
		}
	}, [history.on, stepHistory])

	const session = useMemo<GridEditingSession>(
		() => ({
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			endSession,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
			managed,
		}),
		[
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			managed,
			endSession,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
		],
	)

	return {
		session,
		enterEdit,
		sessionKeys: managed ? sessionKeys : undefined,
		historyKeys,
		stepHistory: stepFromHandle,
		sessionLeave: commitOn === 'explicit' ? undefined : { blur: sessionLeave, focus: sessionFocus },
		newRow: {
			position: newRowPosition,
			session: newRow.session,
			enter: newRow.enter,
			editorKind: newRow.editorKind,
		},
	}
}
