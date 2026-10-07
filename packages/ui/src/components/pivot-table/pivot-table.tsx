'use client'

import type { ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import { useLocale } from '../../providers/locale'
import type { scale } from '../../recipes/kata/table'
import { fractionFormat } from '../../utilities'
import { Table, TableBody, TableCell, TableFoot, TableHead, TableHeader, TableRow } from '../table'
import type { PivotAggregation } from './types'
import { type PivotTableKeys, usePivotTable } from './use-pivot-table'

export type { PivotTableKeys } from './use-pivot-table'

/** Which totals a {@link PivotTable} renders: row totals, column totals, both, or none. */
export type PivotTotals = 'row' | 'col' | 'both' | 'none'

/**
 * Props for {@link PivotTable}.
 *
 * @typeParam T - The shape of each source row.
 */
export type PivotTableProps<T> = {
	/** Source rows to pivot. */
	rows: readonly T[]
	/** Fields that identify the row, column, and value dimension of the pivot. */
	keys: PivotTableKeys<T>
	/** How to aggregate the value field within a (row × column) group. @defaultValue 'sum' */
	aggregation?: PivotAggregation
	/** Format cell values. @defaultValue up to two fraction digits in the `<LocaleProvider>` locale, so a whole number prints with no fraction. */
	format?: (value: number) => ReactNode
	/** Label for the row-dimension column. Without it, the corner cell is an empty `<td>`, not a header. */
	rowHeader?: ReactNode
	/** Which totals to render. @defaultValue 'none' */
	totals?: PivotTotals
	/** Explicit ordering of row values. Extras in `rows` are appended. */
	rowOrder?: readonly string[]
	/** Explicit ordering of column values. Extras in `rows` are appended. */
	columnOrder?: readonly string[]
	/** Rendered when no source rows match a (row × column) group. @defaultValue '—' */
	emptyCell?: ReactNode
	/**
	 * The density step of the cell padding. Omit it to take the step of the
	 * nearest density scope. A step makes the table a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** Draw hairline borders around every cell. @defaultValue false */
	outline?: boolean
	/** Zebra-stripe the body rows; `'odd'` / `'even'` pick which. @defaultValue false */
	striped?: boolean | 'odd' | 'even'
	/** Wash the body row under the pointer. @defaultValue false */
	hover?: boolean
	/** Run the table edge-to-edge, dropping the outer gutter. @defaultValue false */
	bleed?: boolean
	/** Classes for the `<table>` element. */
	className?: string
	/** Accessible name for the table: a caption-equivalent for a dense pivot. Optional; a native `<table>` is valid unnamed. */
	'aria-label'?: string
}

/**
 * Two-axis aggregation table: groups `rows` by `(row × column)` `keys` and
 * aggregates the value field into each cell, optionally rendering row/column
 * totals. Renders over {@link Table}.
 *
 * @remarks
 * The numbers align to the inline end, so they follow the text direction. A
 * row header keeps one line, and a table that is too wide scrolls.
 *
 * @typeParam T - The shape of each source row.
 */
export function PivotTable<T>({
	rows,
	keys,
	aggregation = 'sum',
	format,
	rowHeader,
	totals = 'none',
	rowOrder,
	columnOrder,
	emptyCell = '—',
	size,
	outline,
	striped,
	hover,
	bleed,
	className,
	'aria-label': ariaLabel,
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

	const { locale } = useLocale()

	const formatValue = format ?? fractionFormat(locale)

	return (
		<Table
			className={className}
			size={size}
			outline={outline}
			striped={striped}
			hover={hover}
			bleed={bleed}
			tableProps={{ 'data-slot': 'pivot-table', 'aria-label': ariaLabel }}
		>
			<TableHead>
				<TableRow>
					{/* An empty `<th>` is a header with no text (axe empty-table-header), so
					    the corner without a `rowHeader` is a `<td>`. */}
					{rowHeader == null ? <TableCell /> : <TableHeader scope="col">{rowHeader}</TableHeader>}
					{columnKeys.map((col) => (
						<TableHeader key={col} scope="col" className="text-end">
							{col}
						</TableHeader>
					))}
					{showRowTotals && (
						<TableHeader scope="col" className="text-end">
							Total
						</TableHeader>
					)}
				</TableRow>
			</TableHead>
			<TableBody>
				{rowKeys.map((rowKey) => {
					const total = rowTotal(rowKey)

					return (
						<TableRow key={rowKey}>
							<TableHeader scope="row" className="font-medium whitespace-nowrap">
								{rowKey}
							</TableHeader>
							{columnKeys.map((col) => {
								const value = cellValue(rowKey, col)

								return (
									<TableCell key={col} className="text-end tabular-nums">
										{value != null ? formatValue(value) : emptyCell}
									</TableCell>
								)
							})}
							{showRowTotals && (
								<TableCell className="text-end font-semibold tabular-nums">
									{total != null ? formatValue(total) : emptyCell}
								</TableCell>
							)}
						</TableRow>
					)
				})}
			</TableBody>
			{showColTotals && (
				<TableFoot>
					<TableRow className="font-semibold">
						<TableHeader scope="row" className="font-semibold whitespace-nowrap">
							Total
						</TableHeader>
						{columnKeys.map((col, i) => {
							const total = colTotals[i]

							return (
								<TableCell key={col} className="text-end font-semibold tabular-nums">
									{total != null ? formatValue(total) : emptyCell}
								</TableCell>
							)
						})}
						{showRowTotals && (
							<TableCell className="text-end font-semibold tabular-nums">
								{grandTotal != null ? formatValue(grandTotal) : emptyCell}
							</TableCell>
						)}
					</TableRow>
				</TableFoot>
			)}
		</Table>
	)
}
