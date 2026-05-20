import { useMemo } from 'react'
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

	const cellValue = (row: string, column: string): number | undefined => {
		const values = groups.get(row)?.get(column)

		return values && values.length > 0 ? aggregate(values, aggregation) : undefined
	}

	const rowTotal = (row: string): number | undefined =>
		aggregateRow(groups, row, columnKeys, aggregation)

	return { rowKeys, columnKeys, cellValue, rowTotal, colTotals, grandTotal }
}
