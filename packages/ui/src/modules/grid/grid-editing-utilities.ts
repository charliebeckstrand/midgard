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
