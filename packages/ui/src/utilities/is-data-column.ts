/**
 * Returns `true` for a column that carries row content. Returns `false` for the
 * selection-checkbox column (`selectable`) and the row-actions column
 * (`actions`).
 */
export function isDataColumn(col: { selectable?: boolean; actions?: unknown }): boolean {
	return !col.selectable && !col.actions
}
