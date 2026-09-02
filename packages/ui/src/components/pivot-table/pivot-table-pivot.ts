import { formatFraction, formatInteger, toNumericCell } from '../../utilities'
import type { PivotAggregation } from './types'

/** Formats a cell value: whole numbers as integers, the rest as fractions. */
export function defaultFormat(value: number): string {
	return Number.isInteger(value) ? formatInteger(value) : formatFraction(value)
}

/**
 * Distinct axis values for `key`: any `explicit` ordering first, then remaining
 * values in row order, deduplicated.
 */
export function resolveAxis<T>(
	rows: readonly T[],
	key: keyof T & string,
	explicit: readonly string[] | undefined,
): string[] {
	return [...new Set([...(explicit ?? []), ...rows.map((row) => String(row[key]))])]
}

/**
 * Buckets each row's numeric `valueKey` into a `row → column → values` map,
 * skipping any cell that isn't a finite number or a numeric string (`null`,
 * `''`, and other non-numeric values are dropped, not counted as `0`).
 */
export function groupValues<T>(
	rows: readonly T[],
	rowKey: keyof T & string,
	columnKey: keyof T & string,
	valueKey: keyof T & string,
): Map<string, Map<string, number[]>> {
	const groups = new Map<string, Map<string, number[]>>()

	for (const entry of rows) {
		const r = String(entry[rowKey])
		const c = String(entry[columnKey])

		const value = toNumericCell(entry[valueKey])

		if (!Number.isFinite(value)) continue

		const row = groups.get(r) ?? new Map<string, number[]>()

		groups.set(r, row)

		const bucket = row.get(c) ?? []

		row.set(c, bucket)

		bucket.push(value)
	}

	return groups
}

/** Reduces `values` by `op`; `count` returns the length, the rest return 0 when empty. */
export function aggregate(values: readonly number[], op: PivotAggregation): number {
	if (op === 'count') return values.length

	if (values.length === 0) return 0

	switch (op) {
		case 'sum':
			return values.reduce((a, b) => a + b, 0)
		case 'avg':
			return values.reduce((a, b) => a + b, 0) / values.length
		case 'min':
			return values.reduce((a, b) => Math.min(a, b))
		case 'max':
			return values.reduce((a, b) => Math.max(a, b))
	}
}

/**
 * Aggregates one row across `columnKeys`; `undefined` when the row holds no
 * values.
 *
 * @remarks
 * Near-identical to {@link aggregateColumn} — fix one axis, walk the other — and
 * deliberately so: row and column are distinct boundaries and each body is about
 * six lines, so a shared walk would cost more in indirection than it saves
 * (CLAUDE.md 1.1).
 */
export function aggregateRow(
	groups: Map<string, Map<string, number[]>>,
	row: string,
	columnKeys: readonly string[],
	op: PivotAggregation,
): number | undefined {
	const values = columnKeys.flatMap((col) => groups.get(row)?.get(col) ?? [])

	return values.length > 0 ? aggregate(values, op) : undefined
}

/** Aggregates one column across `rowKeys`; `undefined` when the column holds no values. */
export function aggregateColumn(
	groups: Map<string, Map<string, number[]>>,
	rowKeys: readonly string[],
	col: string,
	op: PivotAggregation,
): number | undefined {
	const values = rowKeys.flatMap((row) => groups.get(row)?.get(col) ?? [])

	return values.length > 0 ? aggregate(values, op) : undefined
}

/** Aggregates every value in the grid; `undefined` when it holds none. */
export function aggregateAll(
	groups: Map<string, Map<string, number[]>>,
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const row of groups.values()) for (const bucket of row.values()) values.push(...bucket)

	return values.length > 0 ? aggregate(values, op) : undefined
}
