import { parseNumeric } from '../../utilities'
import { reduceNumbers } from '../../utilities/aggregate'
import type { PivotAggregation } from './types'

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
 * Buckets each row's numeric `valueKey` into a `row → column → values` map. A
 * cell reads through {@link parseNumeric}, the rule the grid aggregates by, so
 * `$1,200` counts as `1200`. A cell that does not parse (`null`, `''`, text) is
 * dropped, not counted as `0`.
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

		const value = parseNumeric(entry[valueKey])

		if (value === null) continue

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

	return reduceNumbers(values, op)
}

/**
 * Aggregates one row across `columnKeys`; `undefined` when the row holds no
 * values.
 *
 * @remarks
 * Near-identical to {@link aggregateColumn}: fix one axis, walk the other. That
 * is deliberate: row and column are distinct boundaries, and each body is about
 * six lines. A shared walk would cost more in indirection than it saves
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
	// Collect as the siblings do. An argument spread (`push(...bucket)`) throws a
	// `RangeError` when one bucket passes the engine's argument limit.
	const values = [...groups.values()].flatMap((row) => [...row.values()].flat())

	return values.length > 0 ? aggregate(values, op) : undefined
}
