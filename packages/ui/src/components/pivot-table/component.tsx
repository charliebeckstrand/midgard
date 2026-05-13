import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import type { PivotAggregation } from './pivot'
import { type PivotTableKeys, usePivotTable } from './use-pivot-table'

export type { PivotAggregation } from './pivot'
export type { PivotTableKeys } from './use-pivot-table'

export type PivotTotals = 'row' | 'col' | 'both' | 'none'

export type PivotTableProps<T> = {
	/** Source rows to pivot. */
	data: readonly T[]
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
	/** Explicit ordering of row values. Extras in `data` are appended. */
	rowOrder?: readonly string[]
	/** Explicit ordering of column values. Extras in `data` are appended. */
	columnOrder?: readonly string[]
	/** Rendered when no source rows match a (row × column) group. @default '—' */
	emptyCell?: ReactNode
	dense?: boolean
	grid?: boolean
	striped?: boolean
	className?: string
}

export function PivotTable<T>({
	data,
	keys,
	aggregation = 'sum',
	format,
	rowHeader,
	totalLabel = 'Total',
	totals = 'none',
	rowOrder,
	columnOrder,
	emptyCell = '—',
	dense,
	grid,
	striped,
	className,
}: PivotTableProps<T>) {
	const { rows, columns, cellValue, rowTotal, colTotals, grandTotal } = usePivotTable(data, keys, {
		aggregation,
		rowOrder,
		columnOrder,
	})

	const showRowTotals = totals === 'row' || totals === 'both'
	const showColTotals = totals === 'col' || totals === 'both'

	const formatValue = format ?? defaultFormat

	return (
		<Table className={className} dense={dense} grid={grid} striped={striped}>
			<TableHead>
				<TableRow>
					<TableHeader>{rowHeader}</TableHeader>
					{columns.map((col) => (
						<TableHeader key={col} className="text-right">
							{col}
						</TableHeader>
					))}
					{showRowTotals && <TableHeader className="text-right">{totalLabel}</TableHeader>}
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((row) => {
					const total = rowTotal(row)

					return (
						<TableRow key={row}>
							<TableCell className="font-medium">{row}</TableCell>
							{columns.map((col) => {
								const value = cellValue(row, col)

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
						<TableCell className="font-semibold">{totalLabel}</TableCell>
						{columns.map((col, i) => {
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

// Cache formatters — `Number.prototype.toLocaleString` constructs a fresh
// Intl.NumberFormat on every call, which becomes measurable in a pivot with
// hundreds of numeric cells.
const integerFormatter = new Intl.NumberFormat()
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

function defaultFormat(value: number): ReactNode {
	return Number.isInteger(value) ? integerFormatter.format(value) : fractionFormatter.format(value)
}
