/**
 * Returns `true` for a column that carries row content. Returns `false` for the
 * selection-checkbox column (`selectable`), the row-actions column (`actions`),
 * and the row drag-handle column (`dragHandle`) — none of which sort, filter,
 * resize, or reorder as data.
 */
export function isDataColumn(col: {
	selectable?: boolean
	actions?: unknown
	dragHandle?: boolean
}): boolean {
	return !col.selectable && !col.actions && !col.dragHandle
}
