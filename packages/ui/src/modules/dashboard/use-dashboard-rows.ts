'use client'

import { useMemo } from 'react'
import { scopeRows } from './engine/dashboard-scope'
import { useDashboardScope } from './use-dashboard-scope'

/** Reads a field of a row by its name: the default reader of {@link useDashboardRows}. */
function readField<T>(row: T, field: string): unknown {
	return row !== null && typeof row === 'object'
		? (row as Record<string, unknown>)[field]
		: undefined
}

/**
 * The rows that the filter scope of the nearest `Dashboard` lets through, for
 * the reader that calls it. It applies the same query as
 * {@link useDashboardScope}, so a tile does not filter itself by its own
 * selection. The module fetches no data; pass the rows that the app holds.
 *
 * @param rows - The rows to filter.
 * @param getValue - Reads a field of a row. The default reads the property with
 * the field name. Hoist it or memoize it, because a new function filters again.
 * @returns The matching rows. The result keeps its identity until the rows or the
 * query change, so it can feed a chart directly.
 */
export function useDashboardRows<T>(
	rows: readonly T[],
	getValue: (row: T, field: string) => unknown = readField,
): T[] {
	const { query } = useDashboardScope()

	return useMemo(() => scopeRows(rows, query, getValue), [rows, query, getValue])
}
