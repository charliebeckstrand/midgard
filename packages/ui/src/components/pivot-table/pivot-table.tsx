'use client'

import type { ReactNode } from 'react'
import type { DensityLevel } from '../../providers/density'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { defaultFormat } from './pivot-table-pivot'
import type { PivotAggregation } from './types'
import { type PivotTableKeys, usePivotTable } from './use-pivot-table'

export type { PivotTableKeys } from './use-pivot-table'

export type PivotTotals = 'row' | 'col' | 'both' | 'none'

export type PivotTableProps<T> = {
	/** Source rows to pivot. */
	rows: readonly T[]
	/** Fields that identify the row, column, and value dimension of the pivot. */
	keys: PivotTableKeys<T>
	/** How to aggregate the value field within a (row × column) group. @default 'sum' */
	aggregation?: PivotAggregation
	/** Format cell values. Defaults to `Number(value).toLocaleString()`. */
	format?: (value: number) => ReactNode
	/** Label for the row-dimension column. */
	rowHeader?: ReactNode
	/** Label for the total row / column. @default 'Total' */
	totalLabel?: string
	/** Which totals to render. @default 'none' */
	totals?: PivotTotals
	/** Explicit ordering of row values. Extras in `rows` are appended. */
	rowOrder?: readonly string[]
	/** Explicit ordering of column values. Extras in `rows` are appended. */
	columnOrder?: readonly string[]
	/** Rendered when no source rows match a (row × column) group. @default '—' */
	emptyCell?: ReactNode
	density?: DensityLevel
	grid?: boolean
	striped?: boolean
	className?: string
}

/** Two-axis aggregation table — groups rows by `(row × column)` keys and aggregates a value field into each cell. */
export function PivotTable<T>({
	rows,
	keys,
	aggregation = 'sum',
	format,
	rowHeader,
	totalLabel = 'Total',
	totals = 'none',
	rowOrder,
	columnOrder,
	emptyCell = '—',
	density,
	grid,
	striped,
	className,
}: PivotTableProps<T>) {
	const { rowKeys, columnKeys, cellValue, rowTotal, colTotals, grandTotal } = usePivotTable(
		rows,
		keys,
		{
			aggregation,
			rowOrder,
			columnOrder,
		},
	)

	const showRowTotals = totals === 'row' || totals === 'both'
	const showColTotals = totals === 'col' || totals === 'both'

	const formatValue = format ?? defaultFormat

	return (
		<Table
			className={className}
			density={density}
			grid={grid}
			striped={striped}
			tableProps={{ 'data-slot': 'pivot-table' }}
		>
			<TableHead>
				<TableRow>
					<TableHeader>{rowHeader}</TableHeader>
					{columnKeys.map((col) => (
						<TableHeader key={col} className="text-right">
							{col}
						</TableHeader>
					))}
					{showRowTotals && <TableHeader className="text-right">{totalLabel}</TableHeader>}
				</TableRow>
			</TableHead>
			<TableBody>
				{rowKeys.map((rowKey) => {
					const total = rowTotal(rowKey)

					return (
						<TableRow key={rowKey}>
							<TableHeader scope="row" className="font-medium">
								{rowKey}
							</TableHeader>
							{columnKeys.map((col) => {
								const value = cellValue(rowKey, col)

								return (
									<TableCell key={col} className="text-right tabular-nums">
										{value != null ? formatValue(value) : emptyCell}
									</TableCell>
								)
							})}
							{showRowTotals && (
								<TableCell className="text-right font-semibold tabular-nums">
									{total != null ? formatValue(total) : emptyCell}
								</TableCell>
							)}
						</TableRow>
					)
				})}
				{showColTotals && (
					<TableRow className="font-semibold">
						<TableHeader scope="row" className="font-semibold">
							{totalLabel}
						</TableHeader>
						{columnKeys.map((col, i) => {
							const total = colTotals[i]

							return (
								<TableCell key={col} className="text-right font-semibold tabular-nums">
									{total != null ? formatValue(total) : emptyCell}
								</TableCell>
							)
						})}
						{showRowTotals && (
							<TableCell className="text-right font-semibold tabular-nums">
								{grandTotal != null ? formatValue(grandTotal) : emptyCell}
							</TableCell>
						)}
					</TableRow>
				)}
			</TableBody>
		</Table>
	)
}
