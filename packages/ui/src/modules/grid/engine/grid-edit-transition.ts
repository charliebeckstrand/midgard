/**
 * The transitions of a cell-scoped session under a controlled `cell`: the plan
 * for each new value, the rows that the plan writes, and the cell that the
 * session settles on. Each function reads its inputs. The editing hook owns
 * the state and the effect that apply a plan.
 */

import type { GridEditSource } from '../grid-data-types'
import type { GridEditableConfig } from '../grid-editing-types'
import { EMPTY_SET } from './grid-constants'
import { columnOf, type GridActiveEdit, isColumnEditable, sameCell } from './grid-editing-utilities'

/**
 * Whether a cell that a consumer names can hold a session: its row is in the
 * source rows, and its column is editable. The grid's own entries pass this by
 * construction. A consumer's `cell` does not, so it is read here. @internal
 */
function isEditableCell<T>(cell: GridActiveEdit, source: GridEditSource<T>): boolean {
	const col = columnOf(source.columns, cell.columnId)

	if (!col || !isColumnEditable(col)) return false

	return source.rows.some((row, index) => source.getKey(row, index) === cell.rowKey)
}

/**
 * The cell a controlled binding last settled on. `raw` is the value as the
 * consumer passed it; `cell` is that value after the editable check.
 *
 * `wait` is set when `raw` names a cell whose row the transition asked to
 * open. Until that row opens, `cell` is still the cell that the session held
 * before, so a declined rows write leaves the session on it. `wait` holds the
 * new cell and the session row that it lands with. @internal
 */
export type SettledCell = {
	raw: GridActiveEdit | null
	cell: GridActiveEdit | null
	wait?: { cell: GridActiveEdit; sessionRow: SessionRow | null }
}

/**
 * The cell that a settled value reads as: the cell it waits for once that
 * row is open, else the cell the session held. @internal
 */
export function readSettled(
	settled: SettledCell,
	rows: Set<string | number>,
): GridActiveEdit | null {
	const wait = settled.wait

	return wait && rows.has(wait.cell.rowKey) ? wait.cell : settled.cell
}

/** Whether a settled value holds `cell`, as its value and its cell, with no wait. @internal */
export function settledAt(settled: SettledCell, cell: GridActiveEdit | null): boolean {
	return !settled.wait && sameCell(settled.raw, cell) && sameCell(settled.cell, cell)
}

/**
 * An uncontrolled entry into a row that is not open yet, made while the
 * session holds a cell. A controlled `rows` can decline the rows write that
 * opens the row. The session then goes back to `from` and its session row,
 * so the declined move changes nothing. @internal
 */
export type CrossRowEntry = {
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
export type CellRequest = {
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
export function crossRowEntry(
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
export function moveSessionRow(
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
 * The session row of the initial cell, or `null` with no initial cell. The row
 * counts as acquired only when the grid seeds it into an uncontrolled set that
 * `defaultRows` lacks. A controlled `rows` gets no seed. @internal
 */
export function initialSessionRow(
	cell: GridActiveEdit | null,
	config: GridEditableConfig | undefined,
): SessionRow | null {
	if (!cell) return null

	const seeded = config?.rows === undefined && !(config?.defaultRows ?? EMPTY_SET).has(cell.rowKey)

	return { rowKey: cell.rowKey, acquired: seeded }
}

/**
 * The cell the binding opens the grid with, read once on mount: the controlled
 * value, else the default. A cell that is not editable opens nothing, and is
 * flagged for the development warning. @internal
 */
export function readInitialCell<T>(
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
export function readControlledCell<T>(
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
export type TransitionPlan = {
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
export function planTransition<T>(args: {
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
export function settleOn(
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
export function writeRowsPlan(
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
