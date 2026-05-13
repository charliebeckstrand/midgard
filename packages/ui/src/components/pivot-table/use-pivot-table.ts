import { useMemo } from 'react'
import {
	aggregate,
	aggregateAll,
	aggregateColumn,
	aggregateRow,
	groupValues,
	resolveAxis,
} from './pivot'
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
	rows: string[]
	columns: string[]
	cellValue: (row: string, column: string) => number | undefined
	rowTotal: (row: string) => number | undefined
	colTotals: (number | undefined)[]
	grandTotal: number | undefined
}

export function usePivotTable<T>(
	data: readonly T[],
	keys: PivotTableKeys<T>,
	{ aggregation = 'sum', rowOrder, columnOrder }: UsePivotTableOptions = {},
): UsePivotTableResult {
	const rows = useMemo(() => resolveAxis(data, keys.row, rowOrder), [data, keys.row, rowOrder])

	const columns = useMemo(
		() => resolveAxis(data, keys.column, columnOrder),
		[data, keys.column, columnOrder],
	)

	const groups = useMemo(
		() => groupValues(data, keys.row, keys.column, keys.value),
		[data, keys.row, keys.column, keys.value],
	)

	const colTotals = useMemo(
		() => columns.map((col) => aggregateColumn(groups, rows, col, aggregation)),
		[columns, groups, rows, aggregation],
	)

	const grandTotal = useMemo(() => aggregateAll(groups, aggregation), [groups, aggregation])

	const cellValue = (row: string, column: string): number | undefined => {
		const values = groups.get(row)?.get(column)

		return values && values.length > 0 ? aggregate(values, aggregation) : undefined
	}

	const rowTotal = (row: string): number | undefined =>
		aggregateRow(groups, row, columns, aggregation)

	return { rows, columns, cellValue, rowTotal, colTotals, grandTotal }
}
