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
}

/**
 * Whether a cell's editor is open: its row is in the editable set and, when a
 * cell-scoped session names one cell, that cell is this one. A null `activeEdit`
 * is row scope, where every cell of a set row qualifies.
 *
 * @remarks This is the module's one definition of "editing here", and three
 * questions read it: which cell mounts an editor, which entry is the no-op of
 * re-entering the cell already open, and which staged drafts a commit sweep must
 * flush (the cells this no longer holds for). Answering them from one predicate
 * is what keeps an editor's lifetime and its value's commit in step. @internal
 */
export function isCellEditing(args: {
	rowKey: string | number
	columnId: string | number
	editableRows: Set<string | number>
	activeEdit: GridActiveEdit | null
}): boolean {
	if (!args.editableRows.has(args.rowKey)) return false

	const active = args.activeEdit

	return active === null || (active.rowKey === args.rowKey && active.columnId === args.columnId)
}
