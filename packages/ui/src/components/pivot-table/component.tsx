import { type ReactNode, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'

export type PivotAggregation = 'sum' | 'count' | 'avg' | 'min' | 'max'

export type PivotTotals = 'row' | 'col' | 'both' | 'none'

export type PivotTableProps<T> = {
	/** Source rows to pivot. */
	data: readonly T[]
	/** Field that identifies a row in the pivot (e.g. `'lane'`). */
	rowKey: keyof T & string
	/** Field that identifies a column in the pivot (e.g. `'period'`). */
	columnKey: keyof T & string
	/** Numeric field to aggregate for each cell (e.g. `'loads'`). */
	valueKey: keyof T & string
	/** How to aggregate `valueKey` within a (row × column) group. @default 'sum' */
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
	rowKey,
	columnKey,
	valueKey,
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
	const rows = useMemo(() => resolveAxis(data, rowKey, rowOrder), [data, rowKey, rowOrder])
	const columns = useMemo(
		() => resolveAxis(data, columnKey, columnOrder),
		[data, columnKey, columnOrder],
	)

	const groups = useMemo(
		() => groupValues(data, rowKey, columnKey, valueKey),
		[data, rowKey, columnKey, valueKey],
	)

	const showRowTotals = totals === 'row' || totals === 'both'
	const showColTotals = totals === 'col' || totals === 'both'

	const formatValue = format ?? defaultFormat

	const colTotals = useMemo(
		() => columns.map((col) => aggregateColumn(groups, rows, col, aggregation)),
		[columns, groups, rows, aggregation],
	)

	const grandTotal = useMemo(() => aggregateAll(groups, aggregation), [groups, aggregation])

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
					const rowTotal = aggregateRow(groups, row, columns, aggregation)

					return (
						<TableRow key={row}>
							<TableCell className="font-medium">{row}</TableCell>
							{columns.map((col) => {
								const values = groups.get(row)?.get(col)

								return (
									<TableCell key={col} className="text-right tabular-nums">
										{values && values.length > 0
											? formatValue(aggregate(values, aggregation))
											: emptyCell}
									</TableCell>
								)
							})}
							{showRowTotals && (
								<TableCell className="text-right font-semibold tabular-nums">
									{rowTotal != null ? formatValue(rowTotal) : emptyCell}
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

// ── helpers ─────────────────────────────────────────────

function resolveAxis<T>(
	data: readonly T[],
	key: keyof T & string,
	explicit: readonly string[] | undefined,
): string[] {
	const seen = new Set<string>()
	const result: string[] = []

	if (explicit) {
		for (const value of explicit) {
			if (!seen.has(value)) {
				seen.add(value)

				result.push(value)
			}
		}
	}

	for (const row of data) {
		const value = String(row[key])

		if (!seen.has(value)) {
			seen.add(value)

			result.push(value)
		}
	}

	return result
}

function groupValues<T>(
	data: readonly T[],
	rowKey: keyof T & string,
	columnKey: keyof T & string,
	valueKey: keyof T & string,
): Map<string, Map<string, number[]>> {
	const groups = new Map<string, Map<string, number[]>>()

	for (const entry of data) {
		const r = String(entry[rowKey])
		const c = String(entry[columnKey])

		const raw = entry[valueKey]

		const value = typeof raw === 'number' ? raw : Number(raw)

		if (!Number.isFinite(value)) continue

		const row = groups.get(r) ?? new Map<string, number[]>()

		if (!groups.has(r)) groups.set(r, row)

		const bucket = row.get(c) ?? []

		if (!row.has(c)) row.set(c, bucket)

		bucket.push(value)
	}

	return groups
}

function aggregate(values: readonly number[], op: PivotAggregation): number {
	if (op === 'count') return values.length

	if (values.length === 0) return 0

	switch (op) {
		case 'sum':
			return values.reduce((a, b) => a + b, 0)
		case 'avg':
			return values.reduce((a, b) => a + b, 0) / values.length
		case 'min':
			return Math.min(...values)
		case 'max':
			return Math.max(...values)
	}
}

function aggregateRow(
	groups: Map<string, Map<string, number[]>>,
	row: string,
	columns: readonly string[],
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const col of columns) {
		const bucket = groups.get(row)?.get(col)

		if (bucket) values.push(...bucket)
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}

function aggregateColumn(
	groups: Map<string, Map<string, number[]>>,
	rows: readonly string[],
	col: string,
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const row of rows) {
		const bucket = groups.get(row)?.get(col)

		if (bucket) values.push(...bucket)
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}

function aggregateAll(
	groups: Map<string, Map<string, number[]>>,
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const row of groups.values()) {
		for (const bucket of row.values()) {
			values.push(...bucket)
		}
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}

function defaultFormat(value: number): ReactNode {
	return Number.isInteger(value)
		? value.toLocaleString()
		: value.toLocaleString(undefined, {
				maximumFractionDigits: 2,
			})
}
