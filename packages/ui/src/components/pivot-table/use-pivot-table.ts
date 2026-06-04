'use client'

import { useCallback, useMemo } from 'react'
import {
	aggregate,
	aggregateAll,
	aggregateColumn,
	aggregateRow,
	groupValues,
	resolveAxis,
} from './pivot-table-pivot'
import type { PivotAggregation } from './types'

export type PivotTableKeys<T> = {
	row: keyof T & string
	column: keyof T & string
	value: keyof T & string
}

export type UsePivotTableOptions = {
	aggregation?: PivotAggregation
	rowOrder?: readonly string[]
	columnOrder?: readonly string[]
}

export type UsePivotTableResult = {
	rowKeys: string[]
	columnKeys: string[]
	cellValue: (row: string, column: string) => number | undefined
	rowTotal: (row: string) => number | undefined
	colTotals: (number | undefined)[]
	grandTotal: number | undefined
}

export function usePivotTable<T>(
	rows: readonly T[],
	keys: PivotTableKeys<T>,
	{ aggregation = 'sum', rowOrder, columnOrder }: UsePivotTableOptions = {},
): UsePivotTableResult {
	const rowKeys = useMemo(() => resolveAxis(rows, keys.row, rowOrder), [rows, keys.row, rowOrder])

	const columnKeys = useMemo(
		() => resolveAxis(rows, keys.column, columnOrder),
		[rows, keys.column, columnOrder],
	)

	const groups = useMemo(
		() => groupValues(rows, keys.row, keys.column, keys.value),
		[rows, keys.row, keys.column, keys.value],
	)

	const colTotals = useMemo(
		() => columnKeys.map((col) => aggregateColumn(groups, rowKeys, col, aggregation)),
		[columnKeys, groups, rowKeys, aggregation],
	)

	const grandTotal = useMemo(() => aggregateAll(groups, aggregation), [groups, aggregation])

	// Aggregate every populated `(row × column)` group once per data change rather
	// than re-reducing each cell on every render. Rendering then becomes O(1) map
	// lookups, so unrelated re-renders (format/density prop changes, parent
	// re-renders) no longer re-run the reductions over the full value set.
	const cells = useMemo(() => {
		const matrix = new Map<string, Map<string, number>>()

		for (const [row, columns] of groups) {
			const rowCells = new Map<string, number>()

			for (const [col, values] of columns) {
				if (values.length > 0) rowCells.set(col, aggregate(values, aggregation))
			}

			matrix.set(row, rowCells)
		}

		return matrix
	}, [groups, aggregation])

	const rowTotals = useMemo(() => {
		const totals = new Map<string, number | undefined>()

		for (const row of rowKeys) {
			totals.set(row, aggregateRow(groups, row, columnKeys, aggregation))
		}

		return totals
	}, [groups, rowKeys, columnKeys, aggregation])

	const cellValue = useCallback(
		(row: string, column: string): number | undefined => cells.get(row)?.get(column),
		[cells],
	)

	const rowTotal = useCallback((row: string): number | undefined => rowTotals.get(row), [rowTotals])

	return { rowKeys, columnKeys, cellValue, rowTotal, colTotals, grandTotal }
}
