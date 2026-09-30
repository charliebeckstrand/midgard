/**
 * The commit path of an editable grid: the checks of a save, the batches that
 * go to `onCommit`, and the settle of a batch that returned a promise. Each
 * function reads its inputs, and writes only the draft store and the tally
 * that it gets. The editing hook owns the refs and the effects that call them.
 */

import type { GridEditSource } from '../grid-data-types'
import type { GridCellChange, GridCellRef, GridEditableConfig } from '../grid-editing-types'
import type { GridColumn } from '../types'
import type { GridSaveOutcome } from './grid-announcements'
import { columnLabel } from './grid-column/label'
import type { GridHistoryCell, GridHistoryStep } from './grid-edit-history'
import {
	columnOf,
	type GridActiveEdit,
	type GridDraft,
	type GridDraftStore,
	isCellEditing,
	isColumnEditable,
	isThenable,
	NEW_ROW_KEY,
	newDraft,
} from './grid-editing-utilities'
import { coercePaste } from './grid-range/paste'
import { unguardField } from './grid-range/tsv'

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
 * applies only where no live row exists. `rowOf` finds the live row (see
 * {@link rowLookup}).
 *
 * @internal
 */
function flushRow<T>(
	rowKey: string | number,
	drafts: RowDrafts,
	source: GridEditSource<T>,
	rowOf: (rowKey: string | number) => T | undefined,
): { row: T | undefined; changes: GridCellChange[]; refused: GridCellChange[] } {
	const { columns } = source

	const live = rowOf(rowKey)

	const changes: GridCellChange[] = []

	const refused: GridCellChange[] = []

	for (const [columnId, draft] of drafts) {
		const cell: GridCellChange = { rowKey, columnId, value: draft.value }

		const check = checkCell(columns, live ?? (draft.row as T), cell)

		// A refused cell leaves the staging map like any other closed cell, so
		// without this list the value the user typed is gone with no report.
		if (check === 'refuse') refused.push(cell)
		else if (check === 'keep') changes.push(cell)
	}

	return { row: live ?? (drafts.values().next().value?.row as T | undefined), changes, refused }
}

/**
 * What the checks of a save make of one changed cell of `row`: it keeps the
 * cell, it drops the cell, or {@link GridColumn.validate} refuses the cell. A
 * cell drops when its column cannot edit now, or when its value is the row's
 * value. @internal
 */
function checkCell<T>(
	columns: readonly GridColumn<T>[],
	row: T,
	cell: GridCellChange,
): 'keep' | 'drop' | 'refuse' {
	const col = columnOf(columns, cell.columnId)

	// The mount predicate closes a locked column's editor on the next render,
	// so the staged value must not write either — the two gates answer to the
	// same `readOnly`. A column the consumer removed resolves to nothing.
	if (!col || !isColumnEditable(col)) return 'drop'

	const original = col.field != null ? row[col.field] : undefined

	if (Object.is(cell.value, original)) return 'drop'

	return col.validate?.(cell.value, row) != null ? 'refuse' : 'keep'
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
	const col = columnOf(source.columns, columnId)

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
		const col = columnOf(source.columns, change.columnId)

		if (col?.field == null) continue

		const { rowKey, columnId, value } = change

		cells.push({ rowKey, columnId, before: row[col.field], after: value })
	}

	return cells
}

/**
 * Finds the live row of a key, keyed over the source rows as `use-grid-table`
 * keys them, or `undefined` when the rows hold none. The index that a
 * positional `getKey` reads is the one the engine gave the row. Where two rows
 * share a key, the first one answers.
 *
 * @remarks Make one lookup for each sweep, paste, fill, or history step. The
 * first find scans the rows and stops at the match, so a sweep that closes one
 * row costs no more than one scan. The second find indexes the rows once, so
 * each later find costs one map lookup, not a scan of the rows. @internal
 */
export function rowLookup<T>(
	source: GridEditSource<T>,
): (rowKey: string | number) => T | undefined {
	let index: Map<string | number, T> | undefined

	let scanned = false

	return (rowKey) => {
		if (!scanned) {
			scanned = true

			return source.rows.find((row, at) => source.getKey(row, at) === rowKey)
		}

		if (index === undefined) {
			const built = new Map<string | number, T>()

			source.rows.forEach((row, at) => {
				const key = source.getKey(row, at)

				if (!built.has(key)) built.set(key, row)
			})

			index = built
		}

		return index.get(rowKey)
	}
}

/**
 * The live value of a history cell, or `null` when its row or its column is
 * gone, or when the column cannot edit now. A locked column keeps its value
 * through an undo, as it does through a save. @internal
 */
export function readHistoryCell<T>(
	source: GridEditSource<T>,
	rowOf: (rowKey: string | number) => T | undefined,
	cell: GridHistoryCell,
): { value: unknown } | null {
	const col = columnOf(source.columns, cell.columnId)

	if (col?.field == null || !isColumnEditable(col)) return null

	const row = rowOf(cell.rowKey)

	return row == null ? null : { value: row[col.field] }
}

/** The cells of `cells`, grouped by row in their first order. @internal */
function byRow<C extends GridCellRef>(cells: readonly C[]): Map<string | number, C[]> {
	const rows = new Map<string | number, C[]>()

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
export type InFlightBatch = {
	rowKey: string | number
	drafts: RowDrafts
	result: PromiseLike<unknown>
	row: string
	labels: Map<string | number, string>
	/** What the batch does: a save, an undo, or a redo. */
	outcome: GridSaveOutcome
	/**
	 * The history cells of the batch. An accepted save records them. A refused
	 * undo or redo puts them back.
	 */
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
 * What the batches of one sweep, or of one write, sent: the column label of
 * each saved cell, the history cells of the saves, and each batch whose sink
 * returned a promise. `row` is the name of the last row that saved, and `rows`
 * counts the rows that saved. @internal
 */
type SendTally = {
	columns: string[]
	history: GridHistoryCell[]
	row: string | undefined
	rows: number
	inFlight: InFlightBatch[]
}

/** An empty {@link SendTally}. @internal */
function sendTally(): SendTally {
	return { columns: [], history: [], row: undefined, rows: 0, inFlight: [] }
}

/** The {@link SavedCells} of a tally. It names the row when one row saved. @internal */
function savedOf(tally: SendTally): SavedCells {
	return {
		columns: tally.columns,
		row: tally.rows === 1 ? tally.row : undefined,
		history: tally.history,
	}
}

/**
 * Sends the changes of one row through the sink as one batch, and adds the
 * result to `tally`. A row with no change, or with no sink to reach, sends
 * nothing and counts nothing. A sink that returns at once saved the batch. A
 * sink that returns a promise did not save it yet, so the batch goes into
 * `inFlight`, with a draft of each change.
 *
 * `record` reads the history cells of the changes, before the sink runs,
 * because a sink can write the row in place. A save records them. `drafts`
 * holds the drafts of a session. A write that no session staged has none, and
 * gets a staged draft for each change. `steps` holds the cells of a history
 * step, which a refused batch puts back. @internal
 */
function dispatchBatch<T>(
	batch: {
		rowKey: string | number
		row: T | undefined
		changes: GridCellChange[]
		outcome: GridSaveOutcome
		record: boolean
		drafts: RowDrafts | undefined
		steps: GridHistoryCell[]
	},
	sink: { source: GridEditSource<T>; onCommit: CommitSink | undefined },
	tally: SendTally,
): void {
	const { rowKey, row, changes } = batch

	const { source, onCommit } = sink

	if (!changes.length || !onCommit) return

	const cells = batch.record ? historyOf(changes, row, source) : []

	const result = onCommit(changes)

	const name = rowName(source, rowKey, row)

	if (!isThenable(result)) {
		for (const change of changes) tally.columns.push(cellLabel(source, change.columnId))

		tally.history.push(...cells)

		tally.row = name

		tally.rows++

		return
	}

	tally.inFlight.push(
		inFlightBatch(
			{
				rowKey,
				rowDrafts: batch.drafts ?? stagedDrafts(changes, row),
				changes,
				result,
				row: name,
				outcome: batch.outcome,
				// A save holds no step cells, and a step holds no saved ones.
				history: batch.steps.length === 0 ? cells : [...cells, ...batch.steps],
			},
			source,
		),
	)
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
export function flushClosedCells<T>(args: {
	drafts: GridDraftStore
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
	source: GridEditSource<T>
	rowOf: (rowKey: string | number) => T | undefined
	onCommit: CommitSink | undefined
	onReject: ((refused: GridCellChange[]) => void) | undefined
}): { saved: SavedCells; inFlight: InFlightBatch[] } {
	const tally = sendTally()

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
		// The take above keeps the new-row slot, so this never matches. It narrows
		// the key to a data row key.
		if (rowKey === NEW_ROW_KEY) continue

		const { row, changes, refused } = flushRow(rowKey, rowDrafts, args.source, args.rowOf)

		// Reported per row, like the commit batch beside it, and independent of it:
		// a row whose every cell was refused reaches no sink at all otherwise.
		if (refused.length > 0) args.onReject?.(refused)

		dispatchBatch(
			{ rowKey, row, changes, outcome: 'updated', record: true, drafts: rowDrafts, steps: [] },
			args,
			tally,
		)
	}

	return { saved: savedOf(tally), inFlight: tally.inFlight }
}

/**
 * One cell of a paste: its row, its column, and the text of the clipboard
 * field that goes into it. @internal
 */
export type GridPasteCell = { rowKey: string | number; columnId: string | number; text: string }

/**
 * One cell of a fill: its row, its column, and the value that goes into it.
 * @internal
 */
export type GridFillCell = GridCellChange

/**
 * The column and the row of a cell that a paste or a fill can write, or
 * `null` when the write skips the cell. A cell is skipped when its column
 * cannot edit now, when its column has no `field`, or when its row is gone.
 * @internal
 */
export function writeTarget<T>(
	source: GridEditSource<T>,
	rowOf: (rowKey: string | number) => T | undefined,
	cell: GridCellRef,
): { col: GridColumn<T>; field: keyof T; row: T } | null {
	const col = columnOf(source.columns, cell.columnId)

	if (col?.field == null || !isColumnEditable(col)) return null

	const row = rowOf(cell.rowKey)

	return row == null ? null : { col, field: col.field, row }
}

/**
 * The change that a paste makes to one cell, or `null` when the paste skips
 * the cell (see {@link writeTarget}). The text loses the one guard apostrophe
 * that a copy adds (see {@link unguardField}). The column's
 * {@link GridColumn.parse} reads it, else {@link coercePaste}. A text that
 * does not fit its cell gives a change with the text as its value, and
 * `fits` is `false`. @internal
 */
export function pasteChange<T>(
	source: GridEditSource<T>,
	rowOf: (rowKey: string | number) => T | undefined,
	cell: GridPasteCell,
): { change: GridCellChange; fits: boolean } | null {
	const target = writeTarget(source, rowOf, cell)

	if (!target) return null

	const { col, field, row } = target

	const text = unguardField(cell.text)

	const read = col.parse ? { value: col.parse(text, row) } : coercePaste(text, row[field])

	const { rowKey, columnId } = cell

	return { change: { rowKey, columnId, value: read ? read.value : text }, fits: read !== null }
}

/** What a step through the history does to its cells. @internal */
export function historyOutcome(step: GridHistoryStep): GridSaveOutcome {
	return step === 'undo' ? 'undone' : 'redone'
}

/**
 * The changes of one row that pass the checks of a save (see
 * {@link checkCell}), and the changes that `validate` refused. A row that is
 * gone keeps no change. @internal
 */
function checkRow<T>(
	changes: readonly GridCellChange[],
	row: T | undefined,
	source: GridEditSource<T>,
): { changes: GridCellChange[]; refused: GridCellChange[] } {
	const kept: GridCellChange[] = []

	const refused: GridCellChange[] = []

	if (row == null) return { changes: kept, refused }

	for (const change of changes) {
		const check = checkCell(source.columns, row, change)

		if (check === 'refuse') refused.push(change)
		else if (check === 'keep') kept.push(change)
	}

	return { changes: kept, refused }
}

/** A staged draft for each of `changes`, keyed by its column id. @internal */
function stagedDrafts<T>(changes: readonly GridCellChange[], row: T | undefined): RowDrafts {
	const drafts: RowDrafts = new Map()

	for (const change of changes) drafts.set(change.columnId, newDraft(change.value, row))

	return drafts
}

/** The cells of a history step on the row of `rowKey`. @internal */
function stepCells(
	rows: Map<string | number, GridHistoryCell[]>,
	rowKey: string | number,
): GridHistoryCell[] {
	return rows.get(rowKey) ?? []
}

/**
 * Sends a batch of changes that no session staged through the sink, one batch
 * for each row, as the commit sweep sends a session's drafts. It returns the
 * cells that saved at once, and each batch whose sink returned a promise. That
 * batch pends as a save does, and its settle speaks `outcome`.
 *
 * With `check` set, each row goes through the checks of a save first (see
 * {@link checkRow}), and the saved cells carry their history. The refused
 * cells return in `refused`. A paste sets it. A history step does not. It
 * writes a value that was valid, and it moved its history entry when it was
 * taken. It passes its cells as `history` instead, and each batch keeps the
 * cells of its row, so a refusal can put them back.
 *
 * @internal
 */
export function sendCells<T>(args: {
	changes: readonly GridCellChange[]
	outcome: GridSaveOutcome
	source: GridEditSource<T>
	rowOf: (rowKey: string | number) => T | undefined
	onCommit: CommitSink | undefined
	check: boolean
	history: readonly GridHistoryCell[]
}): { saved: SavedCells; inFlight: InFlightBatch[]; refused: GridCellChange[] } {
	const { outcome, source, rowOf, check } = args

	const historyRows = byRow(args.history)

	const tally = sendTally()

	const refused: GridCellChange[] = []

	for (const [rowKey, rowChanges] of byRow(args.changes)) {
		const row = rowOf(rowKey)

		const checked = check ? checkRow(rowChanges, row, source) : { changes: rowChanges, refused: [] }

		refused.push(...checked.refused)

		// With no sink, nothing saves, so nothing is announced. A checked write
		// holds no step cells, and a step holds no checked ones.
		dispatchBatch(
			{
				rowKey,
				row,
				changes: checked.changes,
				outcome,
				record: check,
				drafts: undefined,
				steps: stepCells(historyRows, rowKey),
			},
			args,
			tally,
		)
	}

	return { saved: savedOf(tally), inFlight: tally.inFlight, refused }
}

/**
 * Settles each draft of `batch` in the store: accepted, or refused with the
 * error that `refused` names for its column. `reopen` answers whether a
 * refused cell opens beside the session. A draft that the cell no longer holds
 * counts nothing. It returns the column labels of the accepted and the refused
 * cells, for the announcement. It also returns the ids of the accepted cells,
 * for the history. @internal
 */
export function settleDrafts(args: {
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
export function dropStrandedHolds<T>(args: {
	drafts: GridDraftStore
	before: Set<string | number>
	after: Set<string | number>
	gridClosed: Set<string | number>
	rowOf: (rowKey: string | number) => T | undefined
}): number {
	const { before, after, gridClosed, rowOf } = args

	const gone = (rowKey: string | number) => rowOf(rowKey) === undefined

	const closed = (rowKey: string | number) =>
		before.has(rowKey) && !after.has(rowKey) && !gridClosed.has(rowKey)

	// A draft of the new-row slot is never reopened, so the slot test never
	// fails. It narrows the key to a data row key for the two sets.
	const dropped = args.drafts.drop(
		(rowKey, _, draft) =>
			draft.reopened && rowKey !== NEW_ROW_KEY && (closed(rowKey) || gone(rowKey)),
	)

	// A grid close is spent once its row leaves the set. A close that has not
	// landed yet, as under a controlled `cell`, stays for a later sweep.
	for (const rowKey of before) if (!after.has(rowKey)) gridClosed.delete(rowKey)

	return dropped
}
