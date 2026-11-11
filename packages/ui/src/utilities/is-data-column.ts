/**
 * Returns `true` for a column that carries row content. Returns `false` for the
 * selection-checkbox column (`selectable`), the row-actions column (`actions`),
 * the row drag-handle column (`dragHandle`), and the row-expander column
 * (`expander`). None of those sort, filter, resize, or reorder as data.
 */
export function isDataColumn(column: {
	selectable?: boolean
	actions?: unknown
	dragHandle?: boolean
	expander?: boolean
}): boolean {
	return !column.selectable && !column.actions && !column.dragHandle && !column.expander
}
