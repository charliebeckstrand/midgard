import { FOCUSABLE_SELECTOR } from '../../../utilities'
import type { GridCellRef } from '../grid-editing-types'

/** The primitive-typed inline editor the grid mounts when a column supplies no `editCell` slot. @internal */
export type EditorKind = 'text' | 'number' | 'boolean'

/**
 * Picks the inline editor for a cell from its value's primitive type. A boolean
 * drives a yes/no listbox, a number a number input, and everything else (string,
 * null, undefined) a text input. A column's {@link GridColumn.editCell} slot
 * supersedes this for richer controls. @internal
 */
export function inferEditorKind(value: unknown): EditorKind {
	if (typeof value === 'boolean') return 'boolean'

	if (typeof value === 'number') return 'number'

	return 'text'
}

/**
 * Whether a data column can be edited: it isn't `readOnly` and binds an editor —
 * a `field` to read/write, or a custom `editCell` slot. A cell in an editable row
 * renders its editor only when this holds. @internal
 */
export function isColumnEditable(col: {
	readOnly?: boolean
	field?: unknown
	editCell?: unknown
}): boolean {
	return !col.readOnly && (col.field != null || col.editCell != null)
}

/**
 * The next editable column along a row from display index `from`, one `step`
 * to the right (`1`) or the left (`-1`). The walk wraps at the edges, and skips
 * each column {@link isColumnEditable} refuses. It also skips each index that
 * `blocked` names, such as a cell whose commit is in flight. It returns `from`
 * itself when no other column is open to a move, and `-1` when none is.
 * @internal
 */
export function stepEditableColumn(
	columns: readonly { readOnly?: boolean; field?: unknown; editCell?: unknown }[],
	from: number,
	step: 1 | -1,
	blocked?: (index: number) => boolean,
): number {
	const count = columns.length

	for (let offset = 1; offset <= count; offset++) {
		const index = (((from + step * offset) % count) + count) % count

		const column = columns[index]

		if (column && isColumnEditable(column) && !blocked?.(index)) return index
	}

	return -1
}

/** The facts of one key press that a type-to-edit decision reads. @internal */
export type GridKeyPress = {
	key: string
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
	/** Whether an input method composes the press, including the key that starts it. */
	composing: boolean
	/** Whether AltGr made the character. Some platforms also report Ctrl and Alt for it. */
	altGraph: boolean
}

/**
 * Reads a {@link GridKeyPress} off a keyboard event. The key that starts an
 * input-method composition reports `keyCode` 229 before `isComposing` turns
 * true, so both count as composing. The shape is structural, so the engine
 * reads a React event without a runtime import of React. @internal
 */
export function readKeyPress(event: {
	key: string
	ctrlKey: boolean
	metaKey: boolean
	altKey: boolean
	keyCode: number
	nativeEvent: { isComposing: boolean }
	getModifierState: (key: 'AltGraph') => boolean
}): GridKeyPress {
	return {
		key: event.key,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		altKey: event.altKey,
		composing: event.nativeEvent.isComposing || event.keyCode === 229,
		altGraph: event.getModifierState('AltGraph'),
	}
}

/**
 * The value a printable key seeds into an editor that it opens, or `null` when
 * the key must not open one. The seed replaces the cell's value, as in a
 * spreadsheet. A text editor takes the character. A number editor takes a
 * digit only, because it cannot hold a lone sign or point. A yes/no editor
 * takes no seed.
 *
 * @remarks Four kinds of press seed nothing. A press that an input method
 * composes must reach the method, not the grid. A shortcut with Ctrl, Cmd, or
 * Alt is not typing, but AltGr is. A named key (`Tab`, `F2`, `Dead`) has a name
 * longer than one character. Space stays with the cursor, which selects or
 * activates with it. @internal
 */
export function seedFromKey(press: GridKeyPress, kind: EditorKind): string | number | null {
	if (press.composing || press.metaKey) return null

	if ((press.ctrlKey || press.altKey) && !press.altGraph) return null

	if ([...press.key].length !== 1 || press.key === ' ') return null

	if (kind === 'text') return press.key

	if (kind === 'number' && /^\d$/.test(press.key)) return Number(press.key)

	return null
}

/**
 * The one cell a cell-scoped edit session sits on: the public
 * {@link GridCellRef}, under the name the engine reads. @internal
 */
export type GridActiveEdit = GridCellRef

/**
 * Where a draft is in its life. A draft is `'staged'` from the first edit
 * until its session closes the cell. It is `'pending'` while a commit that
 * `onCommit` returned as a promise is in flight.
 *
 * @remarks A pending draft stays in the store, at its cell address. Its cell
 * cannot open, so no edit can stage over it. An accepted commit removes the
 * draft. A refused commit sets it back to `'staged'`, with its error, so the
 * editor that mounts again shows the value and the error. @internal
 */
export type GridDraftStatus = 'staged' | 'pending'

/**
 * One cell's draft: the value that the user typed, its status, and `row`, the
 * row object that the first write staged it against. The commit reads `row`
 * only when the row is no longer in the grid's `rows`, as for a row on
 * another server page.
 *
 * `error` is the message of a commit that the consumer refused. The next edit
 * clears it. `reopened` marks a refused cell that the refusal holds open
 * beside a cell-scoped session. The cell then shows its editor, and the
 * commit sweep leaves the draft until the session holds the cell. @internal
 */
export type GridDraft = {
	value: unknown
	status: GridDraftStatus
	row: unknown
	error: string | undefined
	reopened: boolean
}

/**
 * The drafts of one edit session, keyed by cell. The session owns them, not
 * the editors. A draft lives while the session holds its cell open, and an
 * editor that mounts or unmounts does not change it. An editor that mounts
 * for a cell with a draft shows the draft.
 *
 * @remarks The store has no subscribers. A keystroke writes one record and
 * renders nothing but the editor that took it. The records group by row,
 * because the commit is one batch for each row. @internal
 */
export type GridDraftStore = {
	/**
	 * Stages `value` as the draft of the cell, against the row object `row`. A
	 * later value replaces the value, clears a refusal error, and keeps the
	 * first row snapshot. A write to a cell that the store does not accept is
	 * ignored, and so is a write to a pending draft.
	 */
	stage: (rowKey: string | number, columnId: string | number, value: unknown, row: unknown) => void
	/** Removes the draft of the cell, if there is one and it is not pending. */
	unstage: (rowKey: string | number, columnId: string | number) => void
	/** Removes every draft of the row that is not pending. */
	unstageRow: (rowKey: string | number) => void
	/** The draft of the cell, or `undefined` when the cell has none. */
	read: (rowKey: string | number, columnId: string | number) => GridDraft | undefined
	/**
	 * Removes the staged drafts of each cell that `closed` names, and returns
	 * them, grouped by row. A row with no closed cell is not in the result. A
	 * pending draft stays. A reopened draft stays while its cell is closed, and
	 * loses the mark when `closed` reads its cell as open.
	 */
	take: (
		closed: (rowKey: string | number, columnId: string | number) => boolean,
	) => Map<string | number, Map<string | number, GridDraft>>
	/**
	 * Puts `draft`, which {@link GridDraftStore.take} returned, back at its cell
	 * as `'pending'`, while its commit is in flight.
	 */
	pend: (rowKey: string | number, columnId: string | number, draft: GridDraft) => void
	/**
	 * Settles the pending `draft` of the cell. A `null` error accepts it, and the
	 * draft leaves the store. An error refuses it: the draft is staged again,
	 * with the error, and `reopen` sets its mark. It returns `false`, and
	 * changes nothing, when the cell no longer holds this pending draft.
	 */
	settle: (
		rowKey: string | number,
		columnId: string | number,
		draft: GridDraft,
		refusal: { error: string; reopen: boolean } | null,
	) => boolean
}

/** The records of a {@link GridDraftStore}, keyed by row and then by column. @internal */
type DraftRows = Map<string | number, Map<string | number, GridDraft>>

/** The inner map of `outer` at `key`, created empty when it is absent. @internal */
function rowOf<V>(
	outer: Map<string | number, Map<string | number, V>>,
	key: string | number,
): Map<string | number, V> {
	let row = outer.get(key)

	if (!row) {
		row = new Map()

		outer.set(key, row)
	}

	return row
}

/**
 * Writes `value` as the draft of a cell, when `accepts` takes the write. A
 * keystroke rewrites the cell's record in place, so typing allocates nothing
 * per key, and the record is looked up once. A pending record takes no
 * write. A reopened record takes one without `accepts`, because the refusal
 * holds its cell open. @internal
 */
function writeDraft(
	rows: DraftRows,
	cell: { rowKey: string | number; columnId: string | number },
	write: { value: unknown; snapshot: unknown },
	accepts: (rowKey: string | number, columnId: string | number) => boolean,
): void {
	const draft = rows.get(cell.rowKey)?.get(cell.columnId)

	if (draft) {
		if (draft.status === 'pending') return

		if (!draft.reopened && !accepts(cell.rowKey, cell.columnId)) return

		draft.value = write.value

		draft.error = undefined

		return
	}

	if (!accepts(cell.rowKey, cell.columnId)) return

	rowOf(rows, cell.rowKey).set(cell.columnId, {
		value: write.value,
		status: 'staged',
		row: write.snapshot,
		error: undefined,
		reopened: false,
	})
}

/**
 * Removes the closed records from `rows`, and returns their values. A pending
 * record is in flight, so it stays. A reopened record stays while its cell is
 * closed. When the session holds its cell, the mark goes. @internal
 */
function takeClosed(
	rows: DraftRows,
	closed: (rowKey: string | number, columnId: string | number) => boolean,
): DraftRows {
	const taken: DraftRows = new Map()

	for (const [rowKey, row] of rows) {
		for (const [columnId, draft] of row) {
			if (draft.status === 'pending') continue

			if (!closed(rowKey, columnId)) {
				draft.reopened = false

				continue
			}

			if (draft.reopened) continue

			rowOf(taken, rowKey).set(columnId, draft)

			row.delete(columnId)
		}

		if (row.size === 0) rows.delete(rowKey)
	}

	return taken
}

/**
 * Builds an empty {@link GridDraftStore}. `accepts` answers whether the
 * session holds a cell open, and the store ignores a write to any other cell.
 * @internal
 */
export function createDraftStore(
	accepts: (rowKey: string | number, columnId: string | number) => boolean,
): GridDraftStore {
	const rows: DraftRows = new Map()

	return {
		stage: (rowKey, columnId, value, row) =>
			writeDraft(rows, { rowKey, columnId }, { value, snapshot: row }, accepts),
		unstage: (rowKey, columnId) => {
			const row = rows.get(rowKey)

			if (row?.get(columnId)?.status === 'pending') return

			row?.delete(columnId)

			if (row?.size === 0) rows.delete(rowKey)
		},
		unstageRow: (rowKey) => {
			const row = rows.get(rowKey)

			if (!row) return

			for (const [columnId, draft] of row) if (draft.status !== 'pending') row.delete(columnId)

			if (row.size === 0) rows.delete(rowKey)
		},
		read: (rowKey, columnId) => rows.get(rowKey)?.get(columnId),
		take: (closed) => takeClosed(rows, closed),
		pend: (rowKey, columnId, draft) => {
			draft.status = 'pending'

			draft.error = undefined

			draft.reopened = false

			rowOf(rows, rowKey).set(columnId, draft)
		},
		settle: (rowKey, columnId, draft, refusal) => {
			const row = rows.get(rowKey)

			if (row?.get(columnId) !== draft || draft.status !== 'pending') return false

			if (refusal === null) {
				row.delete(columnId)

				if (row.size === 0) rows.delete(rowKey)

				return true
			}

			draft.status = 'staged'

			draft.error = refusal.error

			draft.reopened = refusal.reopen

			return true
		},
	}
}

/** Focusable editor content inside an editing cell, in preference order. @internal */
export const EDITOR_FOCUSABLE = 'input, select, textarea, button, [tabindex]'

/**
 * The elements of `root` in the tab order, in document order.
 *
 * @remarks {@link FOCUSABLE_SELECTOR} also matches a native control with
 * `tabindex="-1"` and a hidden input, so this filter drops both. The walk
 * matches each element in turn, because jsdom returns a selector list grouped
 * by branch, not in document order. @internal
 */
function tabbablesIn(root: Element): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
		(el) =>
			el.matches(FOCUSABLE_SELECTOR) &&
			el.tabIndex >= 0 &&
			!(el instanceof HTMLInputElement && el.type === 'hidden'),
	)
}

/**
 * Whether Tab from `target` stays inside its editing cell. That is so when
 * the cell has a tabbable element after the one that holds `target`, or one
 * before it for Shift+Tab. The browser then moves focus there. Only Tab from
 * the last element, or Shift+Tab from the first, leaves the cell. A single
 * control therefore always leaves it (WCAG 2.1.1). @internal
 */
export function tabStaysInCell(target: Element, backward: boolean): boolean {
	const cell = target.closest('td[data-grid-col]')

	if (!cell) return false

	const tabbables = tabbablesIn(cell)

	const at = tabbables.findIndex((el) => el.contains(target))

	if (at < 0) return false

	return backward ? at > 0 : at < tabbables.length - 1
}

/** Whether a coord names this cell; a null coord names none. @internal */
export function isSameCell(coord: GridActiveEdit | null, cell: GridActiveEdit): boolean {
	return coord !== null && coord.rowKey === cell.rowKey && coord.columnId === cell.columnId
}

/**
 * Whether a cell's editor is open. Its row is in the editable set and, when a
 * cell-scoped session holds that row, the session's cell is this one. A session
 * narrows the one row it sits on and no other. A row the consumer opens beside
 * it reads row-shaped, every editable cell at once, as does every row while no
 * session runs.
 *
 * @remarks This is the module's one definition of "editing here". Three
 * questions read it. Which cell mounts an editor. Which editor takes focus
 * after an entry. Which staged drafts a commit sweep must
 * flush — the cells this stops holding for. One predicate answering all three
 * keeps an editor's lifetime and its value's commit in step. @internal
 */
export function isCellEditing(args: {
	rowKey: string | number
	columnId: string | number
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
}): boolean {
	if (!args.editableRows.has(args.rowKey)) return false

	const active = args.activeEdit

	// A session narrows its own row. Any other row in the set belongs to the
	// consumer's binding, which names rows and never cells, so it stays whole.
	if (active === null || active.rowKey !== args.rowKey) return true

	return isSameCell(active, args)
}
