'use client'

import { isDataColumn } from '../../../utilities'
import { columnLabel, type GridColumn } from '../types'

/**
 * The accessor a column contributes to an export: its {@link GridColumn.value}
 * (the same value sort and filter read) when set, else the row field named by
 * the column id. Shared by every export type so CSV, Excel, and print read
 * identical cell values.
 *
 * @internal
 */
function exportAccessor<T>(column: GridColumn<T>): (row: T) => unknown {
	if (column.value) return column.value

	return (row) => (row as Record<string | number, unknown>)[column.id]
}

/**
 * Data columns (selection/actions columns skipped), each resolved once to its
 * export label and accessor — so a per-row export loop reads them directly
 * rather than re-branching on `value` for every cell.
 *
 * @internal
 */
export function exportFields<T>(
	columns: GridColumn<T>[],
): { label: string; accessor: (row: T) => unknown }[] {
	return columns
		.filter(isDataColumn)
		.map((column) => ({ label: columnLabel(column), accessor: exportAccessor(column) }))
}
