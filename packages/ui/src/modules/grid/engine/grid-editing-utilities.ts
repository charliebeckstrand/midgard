/** The primitive-typed inline editor the grid mounts when a column supplies no `editCell` slot. @internal */
export type EditorKind = 'text' | 'number' | 'boolean'

/**
 * Picks the inline editor for a cell from its value's primitive type: a boolean
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

/** The one cell a cell-scoped edit session sits on. @internal */
export type GridActiveEdit = {
	rowKey: string | number
	columnId: string | number
	/**
	 * Whether the session put this row in the editable set, rather than finding it
	 * there. A session releases only what it acquired, so leaving a row the
	 * consumer opened narrows it back to row-shaped instead of closing it.
	 */
	acquired: boolean
}

/** Whether a coord names this cell; a null coord names none. @internal */
export function isSameCell(
	coord: GridActiveEdit | null,
	cell: { rowKey: string | number; columnId: string | number },
): boolean {
	return coord !== null && coord.rowKey === cell.rowKey && coord.columnId === cell.columnId
}

/**
 * Whether a cell's editor is open: its row is in the editable set and, when a
 * cell-scoped session holds that row, the session's cell is this one. A session
 * narrows the one row it sits on and no other. A row the consumer opens beside
 * it reads row-shaped, every editable cell at once, as does every row while no
 * session runs.
 *
 * @remarks This is the module's one definition of "editing here". Three
 * questions read it. Which cell mounts an editor. Which entry is the no-op of
 * re-entering the cell already open. Which staged drafts a commit sweep must
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
