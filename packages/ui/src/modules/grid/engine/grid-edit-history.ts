/**
 * The undo history of an editable grid: a record of the saved values of each
 * cell, with no copy of the rows. The consumer owns the data. An undo is
 * therefore a save of the old values through the same sink, and a redo saves
 * the new values again.
 *
 * The history reads values, not identities. A consumer that applies a save
 * immutably gives the grid a new `rows` array on each save. A change of
 * identity therefore cannot tell a refetch from a save. A step writes a cell
 * only when the cell still holds the value that the last save wrote. A cell
 * that changed since keeps its value.
 */

/** One saved cell: its address, and its value before and after the save. @internal */
export type GridHistoryCell = {
	rowKey: string | number
	columnId: string | number
	before: unknown
	after: unknown
}

/** The saved cells of one user action: one commit sweep, or one settled batch. @internal */
export type GridHistoryEntry = readonly GridHistoryCell[]

/** The two stacks of the history, with the newest entry last in each. @internal */
export type GridHistory = {
	undo: readonly GridHistoryEntry[]
	redo: readonly GridHistoryEntry[]
}

/** A step through the history. @internal */
export type GridHistoryStep = 'undo' | 'redo'

/** The most entries that the undo stack holds. The oldest entry goes first. @internal */
export const HISTORY_LIMIT = 100

/** A history with no entries. @internal */
export const EMPTY_HISTORY: GridHistory = { undo: [], redo: [] }

/**
 * Adds a saved entry to the undo stack, and clears the redo stack, because a
 * new save starts a new branch. An empty entry changes nothing. Past `limit`,
 * the oldest entry goes.
 *
 * @internal
 */
export function recordHistory(
	history: GridHistory,
	entry: GridHistoryEntry,
	limit = HISTORY_LIMIT,
): GridHistory {
	if (entry.length === 0) return history

	return { undo: [...history.undo, entry].slice(-limit), redo: [] }
}

/**
 * What the history reads from the grid at a step. `current` gives the live
 * value of a cell, or `null` when its row or its column is gone, or when the
 * column cannot edit now. `drafted` says whether the cell holds a draft,
 * staged or pending.
 *
 * @internal
 */
export type GridHistoryRead = {
	current: (cell: GridHistoryCell) => { value: unknown } | null
	drafted: (cell: GridHistoryCell) => boolean
}

/**
 * The result of one step. `'empty'` means the stack holds no entry.
 * `'blocked'` means a cell of the newest entry holds a draft, so the entry
 * stays. `'stale'` means no cell of the entry holds the value that the entry
 * wrote, so the entry goes. `'applied'` names the cells to write.
 *
 * @internal
 */
export type GridHistoryResult =
	| { status: 'empty' | 'blocked' | 'stale'; history: GridHistory }
	| { status: 'applied'; history: GridHistory; cells: GridHistoryCell[] }

/** The value that `step` expects a cell to hold now. */
function expected(cell: GridHistoryCell, step: GridHistoryStep): unknown {
	return step === 'undo' ? cell.after : cell.before
}

/**
 * Takes the newest entry of the stack that `step` names. The result names the
 * cells that still hold the value that the entry wrote. The entry moves to the
 * other stack with those cells only. An entry with a drafted cell waits, and an
 * entry with no cell left goes.
 *
 * @internal
 */
export function takeHistory(
	history: GridHistory,
	step: GridHistoryStep,
	read: GridHistoryRead,
): GridHistoryResult {
	const from = step === 'undo' ? history.undo : history.redo

	const entry = from.at(-1)

	if (entry === undefined) return { status: 'empty', history }

	if (entry.some(read.drafted)) return { status: 'blocked', history }

	const cells = entry.filter((cell) => {
		const live = read.current(cell)

		return live !== null && Object.is(live.value, expected(cell, step))
	})

	const rest = from.slice(0, -1)

	if (cells.length === 0) {
		const next = step === 'undo' ? { ...history, undo: rest } : { ...history, redo: rest }

		return { status: 'stale', history: next }
	}

	const next =
		step === 'undo'
			? { undo: rest, redo: [...history.redo, cells] }
			: { undo: [...history.undo, cells], redo: rest }

	return { status: 'applied', history: next, cells }
}

/** The value that `step` writes to a cell. @internal */
export function historyValue(cell: GridHistoryCell, step: GridHistoryStep): unknown {
	return step === 'undo' ? cell.before : cell.after
}

/**
 * The step that a key press asks for, or `null`. Ctrl or Cmd with Z undoes.
 * Ctrl or Cmd with Shift and Z redoes, and so does Ctrl or Cmd with Y. A press
 * with Alt is not a step, and neither is a press that an input method composes.
 *
 * @internal
 */
export function historyStep(press: {
	key: string
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
	shiftKey: boolean
	composing: boolean
}): GridHistoryStep | null {
	if (press.composing || press.altKey || !(press.ctrlKey || press.metaKey)) return null

	const key = press.key.toLowerCase()

	if (key === 'y') return 'redo'

	if (key !== 'z') return null

	return press.shiftKey ? 'redo' : 'undo'
}
