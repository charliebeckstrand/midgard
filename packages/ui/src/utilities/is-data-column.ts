/**
 * Returns `true` for a column that carries row content. Returns `false` for the
 * selection-checkbox column (`selectable`), the row-actions column (`actions`),
 * the row drag-handle column (`dragHandle`), and the row-expander column
 * (`expander`) — none of which sort, filter, resize, or reorder as data.
 */
export function isDataColumn(col: {
	selectable?: boolean
	actions?: unknown
	dragHandle?: boolean
	expander?: boolean
}): boolean {
	return !col.selectable && !col.actions && !col.dragHandle && !col.expander
}
