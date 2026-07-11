'use client'

import { isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'
import { columnLabel } from '../grid-column/label'

/** Stringifies a cell value for export: nullish becomes empty, everything else `String()`s. Shared by the CSV and HTML-table serializers. @internal */
export function cellText(value: unknown): string {
	return value == null ? '' : String(value)
}

/**
 * Data columns (selection/actions columns skipped), each resolved once to its
 * export label and {@link columnAccessor} — so a per-row export loop reads them
 * directly rather than re-branching on `value` for every cell, and exports the
 * same values sort, filter, and aggregation read.
 *
 * @internal
 */
export function exportFields<T>(
	columns: GridColumn<T>[],
): { label: string; accessor: (row: T) => unknown }[] {
	return columns
		.filter(isDataColumn)
		.map((column) => ({ label: columnLabel(column), accessor: columnAccessor(column) }))
}
